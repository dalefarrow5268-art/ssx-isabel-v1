"""Translate Isabel behavior plans into deterministic movement/action instructions.

This module is Unreal-friendly but also runs in dry-run mode outside Unreal so we
can validate behavior now and bind the emitted instructions to MetaHuman/AI
components when the home workstation is online.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from anchor_registry import resolve_interaction, load_spec

ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / "office_spec.json"

TARGET_BY_COMMAND = {
    "GO_TO_DESK": "DESK",
    "GO_TO_SCREEN_01": "SCREEN_01",
    "GO_TO_SCREEN_02": "SCREEN_02",
    "GO_TO_SCREEN_03": "SCREEN_03",
    "GO_TO_SCREEN_04": "SCREEN_04",
    "LOOK_AT_USER": "USER",
    "SIT_AT_DESK": "DESK",
    "STAND_FROM_DESK": "DESK",
    "IDLE_WORK": "DESK",
}


def _nav_instruction(target_name: str) -> Dict[str, Any]:
    spec = load_spec(SPEC_PATH)
    resolved = resolve_interaction(SPEC_PATH, target_name)
    rules = spec["nav_rules"]
    return {
        "op": "NAVIGATE",
        "anchor": resolved["anchor_name"],
        "location": {
            "x": resolved["anchor"]["x"],
            "y": resolved["anchor"]["y"],
            "z": resolved["anchor"]["z"],
        },
        "arrival_yaw": resolved["anchor"].get("yaw", 0),
        "speed_cm_s": rules["preferred_walk_speed_cm_s"],
        "slow_radius_cm": rules["slow_radius_cm"],
        "stop_radius_cm": rules["stop_radius_cm"],
    }


def _attention_instruction(target_name: str) -> Dict[str, Any]:
    resolved = resolve_interaction(SPEC_PATH, target_name)
    return {
        "op": "LOOK_AT",
        "target": target_name,
        "world": resolved.get("look_target"),
        "blend_seconds": 0.45,
    }


def _gesture_instruction(target_name: str) -> Dict[str, Any] | None:
    resolved = resolve_interaction(SPEC_PATH, target_name)
    gesture_target = resolved.get("gesture_target")
    if not gesture_target:
        return None
    return {
        "op": "GESTURE",
        "gesture": "POINT_RIGHT_HAND",
        "target": target_name,
        "world": gesture_target,
        "optional": True,
    }


def compile_action(command: str, behavior_plan: Dict[str, Any]) -> Dict[str, Any]:
    target_name = TARGET_BY_COMMAND.get(command)
    instructions: List[Dict[str, Any]] = []

    if command.startswith("GO_TO_") and target_name:
        instructions.append(_nav_instruction(target_name))
        instructions.append(_attention_instruction(target_name))
        gesture = _gesture_instruction(target_name)
        if gesture:
            instructions.append(gesture)

    elif command == "LOOK_AT_USER":
        instructions.extend([
            {"op": "EYES", "target": "USER", "lead_ms": 120},
            _attention_instruction("USER"),
            {"op": "EXPRESSION", "name": "SOFT_SMILE", "weight": 0.35, "blend_seconds": 0.6},
        ])

    elif command == "SIT_AT_DESK":
        instructions.extend([
            _nav_instruction("DESK"),
            {"op": "ALIGN", "anchor": "ISABEL_DESK_SEATED", "precise": True},
            {"op": "ANIMATION", "name": "SIT_AT_DESK", "interruptible": False},
            {"op": "POSTURE", "value": "SEATED"},
        ])

    elif command == "STAND_FROM_DESK":
        instructions.extend([
            {"op": "ANIMATION", "name": "STAND_FROM_DESK", "interruptible": False},
            {"op": "ALIGN", "anchor": "ISABEL_DESK_STAND", "precise": True},
            {"op": "POSTURE", "value": "STANDING"},
        ])

    elif command == "IDLE_WORK":
        instructions.extend([
            {"op": "ALIGN", "anchor": "ISABEL_DESK_SEATED", "precise": True},
            {"op": "POSTURE", "value": "SEATED"},
            {"op": "IDLE_SET", "name": "DESK_WORK", "loops": behavior_plan.get("loop", [])},
        ])

    else:
        for step in behavior_plan.get("sequence", []):
            instructions.append({"op": "BEHAVIOR_STEP", "name": step})

    return {
        "command": command,
        "target": target_name,
        "posture": behavior_plan.get("posture"),
        "instructions": instructions,
    }


def execute_dry_run(command: str, behavior_plan: Dict[str, Any]) -> Dict[str, Any]:
    compiled = compile_action(command, behavior_plan)
    return {"mode": "dry-run", "accepted": True, **compiled}


if __name__ == "__main__":
    from office_command_receiver import resolve_command

    commands = [
        "LOOK_AT_USER", "GO_TO_DESK", "GO_TO_SCREEN_01", "GO_TO_SCREEN_02",
        "GO_TO_SCREEN_03", "GO_TO_SCREEN_04", "SIT_AT_DESK",
        "STAND_FROM_DESK", "IDLE_WORK",
    ]
    for command in commands:
        action = resolve_command(command)
        print(json.dumps(execute_dry_run(command, action["plan"]), indent=2))
