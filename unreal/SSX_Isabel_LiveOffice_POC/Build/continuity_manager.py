"""Persistent continuity model for Isabel's live office."""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "office_continuity_state.json"
RUNTIME_PATH = ROOT / ".office_runtime_state.json"

STABLE_POSTURES = {"SEATED", "STANDING"}
TRANSITIONAL_ACTIVITIES = {"SIT_AT_DESK", "STAND_FROM_DESK", "GO_TO_DESK", "GO_TO_SCREEN_01", "GO_TO_SCREEN_02", "GO_TO_SCREEN_03", "GO_TO_SCREEN_04"}


def _model() -> Dict[str, Any]:
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


def default_state() -> Dict[str, Any]:
    return deepcopy(_model()["default"])


def load_state() -> Dict[str, Any]:
    if not RUNTIME_PATH.exists():
        return default_state()
    try:
        state = json.loads(RUNTIME_PATH.read_text(encoding="utf-8"))
    except Exception:
        return default_state()
    return normalize_for_resume(state)


def save_state(state: Dict[str, Any]) -> None:
    RUNTIME_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def normalize_for_resume(state: Dict[str, Any]) -> Dict[str, Any]:
    out = deepcopy(default_state())
    out["isabel"].update(state.get("isabel", {}))
    out["office"].update(state.get("office", {}))

    activity = out["isabel"].get("activity")
    posture = out["isabel"].get("posture")
    if activity in TRANSITIONAL_ACTIVITIES or posture not in STABLE_POSTURES:
        # Resume only from a safe stable endpoint.
        if str(out["isabel"].get("anchor", "")).startswith("SCREEN_"):
            out["isabel"]["posture"] = "STANDING"
            out["isabel"]["activity"] = "IDLE_STAND"
        else:
            out["isabel"]["anchor"] = "ISABEL_DESK_SEATED"
            out["isabel"]["posture"] = "SEATED"
            out["isabel"]["activity"] = "IDLE_WORK"
    out["isabel"]["speaking"] = False
    return out


def apply_completed_action(state: Dict[str, Any], command: str, result: Dict[str, Any] | None = None) -> Dict[str, Any]:
    out = deepcopy(state)
    isabel = out["isabel"]
    office = out["office"]
    isabel["last_command"] = command

    if command == "CAMERA_ARRIVAL":
        office["camera"] = "CAMERA_ARRIVAL"
    elif command == "LOOK_AT_USER":
        isabel["attention"] = "USER"
    elif command == "IDLE_WORK":
        isabel.update({"anchor": "ISABEL_DESK_SEATED", "posture": "SEATED", "activity": "IDLE_WORK", "attention": "SCREEN_02"})
    elif command == "SIT_AT_DESK":
        isabel.update({"anchor": "ISABEL_DESK_SEATED", "posture": "SEATED", "activity": "IDLE_WORK"})
    elif command == "STAND_FROM_DESK":
        isabel.update({"anchor": "ISABEL_DESK_STAND", "posture": "STANDING", "activity": "IDLE_STAND"})
    elif command == "GO_TO_DESK":
        isabel.update({"anchor": "ISABEL_DESK_STAND", "posture": "STANDING", "activity": "IDLE_STAND", "attention": "DESK"})
    elif command.startswith("GO_TO_SCREEN_"):
        screen = command.removeprefix("GO_TO_")
        isabel.update({"anchor": f"{screen}_VIEW", "posture": "STANDING", "activity": "IDLE_STAND", "attention": screen})
        office["active_screen"] = screen

    if result:
        out["last_result"] = result
    save_state(out)
    return out


if __name__ == "__main__":
    state = load_state()
    state = apply_completed_action(state, "GO_TO_SCREEN_03", {"ok": True})
    print(json.dumps(state, indent=2))
