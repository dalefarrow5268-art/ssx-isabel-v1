"""Pixel Streaming 2 runtime health binding for the Isabel Live Office POC.

Prepared for execution inside Unreal Engine 5.7 on the home GPU machine.
This module deliberately keeps the Pixel Streaming transport adapter isolated from
Isabel behavior/state logic so Epic API changes can be handled in one place.
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Callable, Dict, Optional

try:
    import unreal  # type: ignore
except Exception:  # Allows contract tests outside Unreal.
    unreal = None


BUILD_DIR = Path(__file__).resolve().parent
SPEC_PATH = BUILD_DIR / "pixel_streaming_health_spec.json"


@dataclass
class ComponentHealth:
    status: str
    detail: str = ""


class IsabelPixelStreamingHealthBinding:
    def __init__(self, send_message: Callable[[str], None], session_id: Optional[str] = None):
        self.send_message = send_message
        self.session_id = session_id or str(uuid.uuid4())
        self.connection_epoch = 0
        self.last_browser_heartbeat = 0.0
        self.last_health_sent = 0.0
        self.spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))

    def begin_connection_epoch(self) -> None:
        self.connection_epoch += 1
        self.last_browser_heartbeat = time.monotonic()
        self.emit("isabel.unreal.ready", {
            "runtime": "unreal-5.7",
            "session_id": self.session_id,
            "connection_epoch": self.connection_epoch,
        })
        self.send_health_snapshot()

    def receive_browser_payload(self, raw: str) -> Dict[str, Any]:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError as exc:
            self.emit_error("invalid_json", str(exc))
            return {"ok": False, "reason": "invalid_json"}

        event_type = message.get("type") or message.get("event")
        if event_type in ("isabel.browser.hello", "browser.hello"):
            self.begin_connection_epoch()
            return {"ok": True, "handled": "hello"}
        if event_type in ("isabel.browser.heartbeat", "browser.heartbeat"):
            self.last_browser_heartbeat = time.monotonic()
            self.emit("isabel.unreal.heartbeat", {"received": True})
            return {"ok": True, "handled": "heartbeat"}
        if event_type in ("isabel.health.request", "health.request"):
            self.send_health_snapshot()
            return {"ok": True, "handled": "health_request"}

        # Compatibility with the existing web command envelope.
        if message.get("source") == "ssx-isabel-web" and message.get("type") == "office-command":
            return self._forward_office_command(message)

        self.emit_error("unsupported_message", event_type or "unknown")
        return {"ok": False, "reason": "unsupported_message"}

    def _forward_office_command(self, message: Dict[str, Any]) -> Dict[str, Any]:
        request_id = message.get("requestId")
        command = message.get("command")
        if not request_id or not command:
            self.emit_error("invalid_command_envelope", "requestId and command are required")
            return {"ok": False, "reason": "invalid_command_envelope"}

        try:
            from office_command_receiver import receive_command  # type: ignore
            result = receive_command(message)
        except Exception as exc:
            self.emit("isabel.command.ack", {
                "requestId": request_id,
                "command": command,
                "accepted": False,
                "reason": str(exc),
            })
            return {"ok": False, "reason": str(exc)}

        self.emit("isabel.command.ack", {
            "requestId": request_id,
            "command": command,
            "accepted": True,
            "result": result,
        })
        return {"ok": True, "result": result}

    def collect_health(self) -> Dict[str, Any]:
        actors = self._actor_names()
        character_ok = "ISABEL_CHARACTER" in actors
        camera_ok = "CAMERA_ARRIVAL" in actors
        screens = {f"SCREEN_0{i}": ComponentHealth("ready" if f"SCREEN_0{i}" in actors else "missing") for i in range(1, 5)}

        identity_lock_ok = (BUILD_DIR / "isabel_identity_lock.json").exists()
        geometry_lock_ok = (BUILD_DIR / "office_spec.json").exists()
        required_ok = character_ok and camera_ok and all(v.status == "ready" for v in screens.values())

        transport_age = max(0.0, time.monotonic() - self.last_browser_heartbeat) if self.last_browser_heartbeat else None
        transport_status = "ready" if transport_age is not None and transport_age < 5.0 else "waiting"

        overall = "LIVE" if required_ok and identity_lock_ok and geometry_lock_ok and transport_status == "ready" else "DEGRADED"

        return {
            "session_id": self.session_id,
            "connection_epoch": self.connection_epoch,
            "timestamp": time.time(),
            "transport": {"status": transport_status, "heartbeat_age_s": transport_age},
            "runtime": {"status": "ready" if unreal is not None else "contract-only"},
            "character": asdict(ComponentHealth("ready" if character_ok else "missing")),
            "camera": asdict(ComponentHealth("ready" if camera_ok else "missing")),
            "screens": {name: asdict(value) for name, value in screens.items()},
            "identity_lock": identity_lock_ok,
            "geometry_lock": geometry_lock_ok,
            "voice": {"status": "unknown"},
            "memory": {"status": "unknown"},
            "project_data": {"status": "unknown"},
            "overall": overall,
        }

    def send_health_snapshot(self) -> Dict[str, Any]:
        snapshot = self.collect_health()
        self.emit("isabel.health.snapshot", snapshot)
        self.last_health_sent = time.monotonic()
        return snapshot

    def tick(self) -> None:
        now = time.monotonic()
        if now - self.last_health_sent >= 2.0:
            self.send_health_snapshot()

    def emit(self, event_type: str, payload: Dict[str, Any]) -> None:
        envelope = {
            "source": "ssx-isabel-unreal",
            "version": 1,
            "type": event_type,
            "eventId": str(uuid.uuid4()),
            "sessionId": self.session_id,
            "connectionEpoch": self.connection_epoch,
            "issuedAt": time.time(),
            "payload": payload,
        }
        self.send_message(json.dumps(envelope, separators=(",", ":")))

    def emit_error(self, code: str, detail: str) -> None:
        self.emit("isabel.error", {"code": code, "detail": detail})

    @staticmethod
    def _actor_names() -> set[str]:
        if unreal is None:
            return set()
        subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        return {actor.get_actor_label() for actor in subsystem.get_all_level_actors()}


def bind_to_pixel_streaming2() -> IsabelPixelStreamingHealthBinding:
    """Create the health binding and attach it to Pixel Streaming 2 when running in UE.

    Epic has changed Python exposure around Pixel Streaming between engine releases,
    so the actual delegate names are resolved defensively on the Saturday machine.
    This function fails loudly instead of pretending the transport is connected.
    """
    if unreal is None:
        raise RuntimeError("Unreal Python API is not available")

    candidates = [
        "PixelStreaming2Subsystem",
        "PixelStreamingSubsystem",
    ]
    subsystem = None
    for class_name in candidates:
        cls = getattr(unreal, class_name, None)
        if cls:
            try:
                subsystem = unreal.get_engine_subsystem(cls)
                if subsystem:
                    break
            except Exception:
                pass

    if subsystem is None:
        raise RuntimeError("Pixel Streaming subsystem not exposed to Python; attach the project adapter to the PS2 data-channel delegate in Blueprint/C++.")

    send_candidates = ["send_player_message", "send_message", "send_response"]
    sender = None
    for name in send_candidates:
        fn = getattr(subsystem, name, None)
        if callable(fn):
            sender = fn
            break
    if sender is None:
        raise RuntimeError("Pixel Streaming send function not found on the UE 5.7 subsystem")

    binding = IsabelPixelStreamingHealthBinding(lambda msg: sender(msg))
    binding.begin_connection_epoch()
    return binding


if __name__ == "__main__":
    print(json.dumps(IsabelPixelStreamingHealthBinding(print).collect_health(), indent=2))
