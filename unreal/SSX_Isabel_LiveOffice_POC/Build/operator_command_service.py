from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse

BUILD_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BUILD_DIR / "isabel_machine_config.json"
STATUS_PATH = BUILD_DIR / "latest_operator_service_status.json"

ALLOWED_COMMANDS = {
    "RUN_HEALTH_REPORT": ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(BUILD_DIR / "run_health_report.ps1")],
    "RUN_RUNTIME_SMOKE": [sys.executable, str(BUILD_DIR / "runtime_smoke_test.py")],
    "RUN_ADVERSARIAL_BENCHMARK": [sys.executable, str(BUILD_DIR / "adversarial_benchmark.py")],
    "RUN_COMMISSIONING_DASHBOARD": [sys.executable, str(BUILD_DIR / "commissioning_dashboard.py")],
    "RUN_LIVE_REHEARSAL": [sys.executable, str(BUILD_DIR / "live_rehearsal.py")],
}

BLOCKED_TOKENS = {
    "cmd.exe", "powershell -command", "python -c", "exec(", "eval(", "subprocess.popen",
}


def load_allowed_origins() -> set[str]:
    origins = {"http://localhost", "http://127.0.0.1"}
    if CONFIG_PATH.exists():
        try:
            cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            for origin in cfg.get("web", {}).get("allowed_origins", []):
                if isinstance(origin, str) and origin.strip():
                    origins.add(origin.rstrip("/"))
            front = cfg.get("web", {}).get("front_door_url")
            if isinstance(front, str) and front.strip():
                parsed = urlparse(front)
                if parsed.scheme and parsed.netloc:
                    origins.add(f"{parsed.scheme}://{parsed.netloc}")
        except Exception:
            pass
    return origins


ALLOWED_ORIGINS = load_allowed_origins()


@dataclass
class Job:
    id: str
    command: str
    state: str
    started_at: float
    completed_at: Optional[float] = None
    return_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    error: Optional[str] = None


class OperatorService:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.jobs: Dict[str, Job] = {}
        self.started_at = time.time()
        self.last_error: Optional[str] = None
        self.write_status()

    def write_status(self) -> None:
        with self.lock:
            payload = {
                "service": "isabel-operator-command-service",
                "startedAt": self.started_at,
                "updatedAt": time.time(),
                "state": "READY" if not self.last_error else "DEGRADED",
                "lastError": self.last_error,
                "allowedOrigins": sorted(ALLOWED_ORIGINS),
                "jobs": [asdict(j) for j in self.jobs.values()],
            }
        STATUS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def run_allowed(self, command: str) -> Job:
        if command not in ALLOWED_COMMANDS:
            raise ValueError(f"Command not allowed: {command}")

        argv = ALLOWED_COMMANDS[command]
        joined = " ".join(argv).lower()
        if any(token in joined for token in BLOCKED_TOKENS):
            raise RuntimeError("Unsafe command template blocked")

        if not Path(argv[-1]).exists():
            raise FileNotFoundError(f"Commissioning command target missing: {argv[-1]}")

        job = Job(id=str(uuid.uuid4()), command=command, state="RUNNING", started_at=time.time())
        with self.lock:
            self.jobs[job.id] = job
            self.write_status()

        def worker() -> None:
            try:
                proc = subprocess.run(
                    argv,
                    cwd=str(BUILD_DIR),
                    capture_output=True,
                    text=True,
                    timeout=600,
                    shell=False,
                )
                job.return_code = proc.returncode
                job.stdout = proc.stdout[-12000:]
                job.stderr = proc.stderr[-12000:]
                job.state = "PASS" if proc.returncode == 0 else "FAILED"
            except subprocess.TimeoutExpired as exc:
                job.state = "FAILED"
                job.error = f"Timeout: {exc}"
            except Exception as exc:
                job.state = "FAILED"
                job.error = str(exc)
                self.last_error = str(exc)
            finally:
                job.completed_at = time.time()
                self.write_status()

        threading.Thread(target=worker, daemon=True).start()
        return job

    def get_status(self) -> Dict[str, Any]:
        self.write_status()
        return json.loads(STATUS_PATH.read_text(encoding="utf-8"))

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            job = self.jobs.get(job_id)
            return asdict(job) if job else None


SERVICE = OperatorService()


class Handler(BaseHTTPRequestHandler):
    server_version = "IsabelOperator/1.1"

    def _cors_origin(self) -> Optional[str]:
        origin = self.headers.get("Origin")
        if not origin:
            return None
        normalized = origin.rstrip("/")
        if normalized in ALLOWED_ORIGINS:
            return origin
        return None

    def _send(self, code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        cors = self._cors_origin()
        if cors:
            self.send_header("Access-Control-Allow-Origin", cors)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if not self._cors_origin():
            self._send(403, {"error": "origin_not_allowed"})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", ""))
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:
        if self.headers.get("Origin") and not self._cors_origin():
            self._send(403, {"error": "origin_not_allowed"})
            return
        if self.path == "/health":
            self._send(200, {"ok": True, "service": "isabel-operator-command-service", "version": 1})
            return
        if self.path == "/status":
            self._send(200, SERVICE.get_status())
            return
        if self.path.startswith("/jobs/"):
            job_id = self.path.split("/", 2)[2]
            job = SERVICE.get_job(job_id)
            self._send(200 if job else 404, job or {"error": "job_not_found"})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.headers.get("Origin") and not self._cors_origin():
            self._send(403, {"error": "origin_not_allowed"})
            return
        if self.path != "/command":
            self._send(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 8192:
                self._send(400, {"error": "invalid_payload_size"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            command = str(payload.get("command", ""))
            job = SERVICE.run_allowed(command)
            self._send(202, {"accepted": True, "job": asdict(job)})
        except ValueError as exc:
            self._send(403, {"error": str(exc)})
        except Exception as exc:
            SERVICE.last_error = str(exc)
            SERVICE.write_status()
            self._send(500, {"error": str(exc)})

    def log_message(self, fmt: str, *args: Any) -> None:
        return


def main() -> None:
    host = os.environ.get("ISABEL_OPERATOR_HOST", "127.0.0.1")
    port = int(os.environ.get("ISABEL_OPERATOR_PORT", "8765"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Isabel operator command service listening on http://{host}:{port}")
    print(f"Allowed browser origins: {', '.join(sorted(ALLOWED_ORIGINS))}")
    server.serve_forever()


if __name__ == "__main__":
    main()
