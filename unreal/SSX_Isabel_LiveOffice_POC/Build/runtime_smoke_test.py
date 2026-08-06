"""Offline smoke test for the Isabel Unreal runtime adapter contract."""
from __future__ import annotations

import json
from office_command_receiver import receive
from unreal_runtime_adapter import execute_plan


def run(command: str):
    message = {
        "source": "ssx-isabel-web",
        "version": 1,
        "type": "office-command",
        "command": command,
        "issuedAt": "2026-08-06T20:46:00.000Z",
        "requestId": f"smoke-{command.lower()}",
    }
    resolved = receive(message)
    action = resolved["action"]
    if action["kind"] == "camera":
        plan = {"instructions": [{"op": "CAMERA", "camera": "CAMERA_ARRIVAL"}]}
    else:
        plan = action.get("compiled", action.get("plan", {}))
    result = execute_plan(plan)
    return {"command": command, "resolved": resolved, "runtime": result}


if __name__ == "__main__":
    commands = [
        "CAMERA_ARRIVAL",
        "LOOK_AT_USER",
        "STAND_FROM_DESK",
        "GO_TO_SCREEN_01",
        "GO_TO_SCREEN_03",
        "GO_TO_DESK",
        "SIT_AT_DESK",
        "IDLE_WORK",
    ]
    print(json.dumps([run(c) for c in commands], indent=2))
