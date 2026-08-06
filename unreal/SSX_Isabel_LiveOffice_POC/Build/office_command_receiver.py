"""Isabel live-office command receiver scaffold.

This module is intentionally engine-light so we can test the protocol before the
home AI workstation is online. In Unreal, Pixel Streaming messages will be
translated into these commands and dispatched into the behavior state machine.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent
STATE_PATH = ROOT / "isabel_behavior_state.json"

VALID_COMMANDS = {
    "CAMERA_ARRIVAL",
    "LOOK_AT_USER",
    "GO_TO_DESK",
    "GO_TO_SCREEN_01",
    "GO_TO_SCREEN_02",
    "GO_TO_SCREEN_03",
    "GO_TO_SCREEN_04",
    "SIT_AT_DESK",
    "STAND_FROM_DESK",
    "IDLE_WORK",
}


@dataclass(frozen=True)
class OfficeMessage:
    source: str
    version: int
    type: str
    command: str
    issuedAt: str
    requestId: str

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "OfficeMessage":
        required = {"source", "version", "type", "command", "issuedAt", "requestId"}
        missing = required.difference(payload)
        if missing:
            raise ValueError(f"Missing fields: {sorted(missing)}")
        msg = cls(**{k: payload[k] for k in required})
        if msg.source != "ssx-isabel-web":
            raise ValueError("Unexpected source")
        if msg.version != 1:
            raise ValueError("Unsupported protocol version")
        if msg.type != "office-command":
            raise ValueError("Unsupported message type")
        if msg.command not in VALID_COMMANDS:
            raise ValueError(f"Unknown command: {msg.command}")
        return msg


def load_behavior_model() -> Dict[str, Any]:
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def resolve_command(command: str) -> Dict[str, Any]:
    model = load_behavior_model()
    if command == "CAMERA_ARRIVAL":
        return {"kind": "camera", "camera": "ARRIVAL"}
    state = model["states"].get(command)
    if not state:
        raise ValueError(f"No behavior state mapped for {command}")
    return {"kind": "behavior", "state": command, "plan": state}


def receive(raw_payload: str | Dict[str, Any]) -> Dict[str, Any]:
    payload = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
    message = OfficeMessage.from_dict(payload)
    action = resolve_command(message.command)
    return {
        "ok": True,
        "requestId": message.requestId,
        "command": message.command,
        "action": action,
    }


if __name__ == "__main__":
    example = {
        "source": "ssx-isabel-web",
        "version": 1,
        "type": "office-command",
        "command": "LOOK_AT_USER",
        "issuedAt": "2026-08-06T20:00:00.000Z",
        "requestId": "local-smoke-test",
    }
    print(json.dumps(receive(example), indent=2))
