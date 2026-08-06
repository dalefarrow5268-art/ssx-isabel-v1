from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

BUILD = Path(__file__).resolve().parent

SOURCES = {
    "machine_discovery": BUILD / "latest_machine_discovery.json",
    "health_report": BUILD / "latest_health_report.json",
    "runtime_smoke": BUILD / "latest_runtime_smoke_report.json",
    "adversarial_benchmark": BUILD / "latest_adversarial_benchmark_report.json",
    "watchdog": BUILD / "latest_watchdog_status.json",
    "live_session_gate": BUILD / "latest_live_session_gate.json",
}

SEVERITY = {"PASS": 0, "READY": 0, "HEALTHY": 0, "DEGRADED": 1, "NEEDS_ATTENTION": 1, "BLOCKED": 2, "FAIL": 2, "OFFLINE": 2, "MISSING": 2}


def load_json(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "FAIL", "error": f"Unreadable JSON: {exc}"}


def normalize_status(name: str, payload):
    if payload is None:
        return "MISSING", "Report not present yet"
    candidates = [
        payload.get("status"), payload.get("state"), payload.get("overall"),
        payload.get("result"), payload.get("ready_state")
    ]
    raw = next((str(v).upper() for v in candidates if v is not None), None)
    if raw is None:
        # Some discovery reports are informational, not pass/fail.
        if name == "machine_discovery":
            return "PASS", "Discovery data present"
        return "DEGRADED", "Report present but no canonical status field"
    if raw in {"PASS", "READY", "HEALTHY"}:
        return "PASS", raw
    if raw in {"DEGRADED", "NEEDS_ATTENTION", "WARNING", "WARN"}:
        return "DEGRADED", raw
    if raw in {"BLOCKED", "FAIL", "FAILED", "OFFLINE", "ERROR"}:
        return "BLOCKED", raw
    return "DEGRADED", raw


def main():
    items = []
    worst = 0
    for name, path in SOURCES.items():
        payload = load_json(path)
        status, detail = normalize_status(name, payload)
        worst = max(worst, SEVERITY.get(status, 1))
        items.append({
            "subsystem": name,
            "status": status,
            "detail": detail,
            "source": str(path),
            "present": path.exists(),
        })

    overall = "PASS" if worst == 0 else "DEGRADED" if worst == 1 else "BLOCKED"
    dashboard = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall": overall,
        "live_allowed": overall == "PASS",
        "rules": {
            "blocked_if_any_critical_report_blocked": True,
            "missing_reports_are_blocking_until_generated": True,
            "live_requires_all_gate_reports_pass": True,
        },
        "subsystems": items,
    }

    out = BUILD / "latest_commissioning_dashboard.json"
    out.write_text(json.dumps(dashboard, indent=2), encoding="utf-8")

    print(f"ISABEL COMMISSIONING: {overall}")
    for item in items:
        print(f"  {item['subsystem']:<24} {item['status']:<9} {item['detail']}")
    print(f"Dashboard: {out}")

    raise SystemExit(0 if overall == "PASS" else 1 if overall == "DEGRADED" else 2)


if __name__ == "__main__":
    main()
