"""SSX Isabel live browser <-> Unreal control bridge.

POC adapter for Pixel Streaming 2 data-channel messages. The browser sends the
same office-command envelopes used by app/live-office/protocol.ts. This module
validates the envelope, forwards high-level commands into the existing Isabel
command receiver/runtime adapter, and emits deterministic acknowledgements and
state events back to the Pixel Streaming frontend.

This file is prepared for Unreal 5.7 execution on the home GPU machine. It does
not assume that Unreal is available in CI or on Vercel.
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional

try:
    import unreal  # type: ignore
except Exception:  # pragma: no cover - allows desktop/CI contract testing
    unreal = None


VALID_SOURCE = "ssx-isabel-web"
VALID_VERSION = 1
VALID_TYPE = "office-command"


@dataclass
class BridgeState:
    connection_epoch: int = 0
    last_request_id: Optional[str] = None
    last_command: Optional[str] = None
    last_error: Optional[str] = None
    connected: bool = False
    seen_request_ids: set[str] = field(default_factory=set)


class UnrealLiveControlBridge:
    def __init__(
        self,
        command_handler: Callable[[Dict[str, Any]], Dict[str, Any]],
        outbound_sender: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.command_handler = command_handler
        self.outbound_sender = outbound_sender or self._default_sender
        self.state = BridgeState()

    def connect(self) -> Dict[str, Any]:
        self.state.connection_epoch += 1
        self.state.connected = True
        return self.emit(
            "ready",
            payload={
                "connectionEpoch": self.state.connection_epoch,
                "runtime": "unreal",
                "pixelStreaming": unreal is not None,
            },
        )

    def disconnect(self) -> None:
        self.state.connected = False

    def receive(self, raw_message: str | Dict[str, Any]) -> Dict[str, Any]:
        try:
            message = json.loads(raw_message) if isinstance(raw_message, str) else dict(raw_message)
        except Exception as exc:
            return self.error(None, "invalid_json", str(exc))

        error = self.validate(message)
        if error:
            return self.error(message.get("requestId"), "invalid_envelope", error)

        request_id = str(message["requestId"])
        if request_id in self.state.seen_request_ids:
            # Idempotent replay: acknowledge again, never execute twice.
            return self.emit(
                "ack",
                request_id=request_id,
                payload={"duplicate": True, "command": message["command"]},
            )

        self.state.seen_request_ids.add(request_id)
        self.state.last_request_id = request_id
        self.state.last_command = str(message["command"])

        try:
            result = self.command_handler(message)
        except Exception as exc:
            self.state.last_error = str(exc)
            return self.error(request_id, "command_failed", str(exc))

        self.emit(
            "ack",
            request_id=request_id,
            payload={"duplicate": False, "command": message["command"]},
        )
        return self.emit(
            "state",
            request_id=request_id,
            payload={
                "command": message["command"],
                "result": result,
                "connectionEpoch": self.state.connection_epoch,
            },
        )

    def validate(self, message: Dict[str, Any]) -> Optional[str]:
        if message.get("source") != VALID_SOURCE:
            return "source_mismatch"
        if message.get("version") != VALID_VERSION:
            return "version_mismatch"
        if message.get("type") != VALID_TYPE:
            return "type_mismatch"
        if not isinstance(message.get("command"), str) or not message["command"]:
            return "missing_command"
        if not isinstance(message.get("requestId"), str) or not message["requestId"]:
            return "missing_request_id"
        return None

    def error(self, request_id: Optional[str], reason: str, detail: str) -> Dict[str, Any]:
        self.state.last_error = f"{reason}: {detail}"
        return self.emit(
            "error",
            request_id=request_id,
            payload={"reason": reason, "detail": detail},
        )

    def emit(
        self,
        event: str,
        request_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        envelope: Dict[str, Any] = {
            "source": "ssx-live-office",
            "version": 1,
            "type": "bridge-event",
            "event": event,
            "issuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "payload": payload or {},
        }
        if request_id:
            envelope["requestId"] = request_id
        self.outbound_sender(json.dumps(envelope, separators=(",", ":")))
        return envelope

    @staticmethod
    def _default_sender(payload: str) -> None:
        # Saturday: replace/attach this callback to the Pixel Streaming 2
        # data-channel send API exposed by the project runtime. Keeping it here
        # makes the bridge testable without Unreal installed.
        if unreal is not None:
            unreal.log(f"[ISABEL_BRIDGE_OUT] {payload}")
        else:
            print(payload)


def demo_command_handler(message: Dict[str, Any]) -> Dict[str, Any]:
    """Contract-test fallback. Runtime wiring should call office_command_receiver."""
    return {
        "accepted": True,
        "command": message["command"],
        "mode": "contract_test" if unreal is None else "unreal_runtime",
    }


def smoke_test() -> None:
    sent: list[str] = []
    bridge = UnrealLiveControlBridge(demo_command_handler, sent.append)
    bridge.connect()
    request_id = str(uuid.uuid4())
    message = {
        "source": "ssx-isabel-web",
        "version": 1,
        "type": "office-command",
        "command": "LOOK_AT_USER",
        "issuedAt": "2026-08-06T00:00:00Z",
        "requestId": request_id,
    }
    bridge.receive(message)
    bridge.receive(message)
    assert any('"event":"ready"' in item for item in sent)
    assert sum('"event":"ack"' in item for item in sent) == 2
    assert sum('"event":"state"' in item for item in sent) == 1


if __name__ == "__main__":
    smoke_test()
