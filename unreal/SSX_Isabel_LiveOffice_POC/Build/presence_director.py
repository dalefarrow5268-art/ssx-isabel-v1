"""Presence and arrival planner for Isabel's live office.

This stays engine-light so behavior timing can be validated before the home Unreal
workstation is online. Unreal will bind the returned steps to gaze, head/torso
controls, animation, and speech timing.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "presence_behavior.json"


def load_model() -> Dict[str, Any]:
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


@dataclass
class PresenceContext:
    user_present: bool = False
    is_walking: bool = False
    is_speaking: bool = False
    stable_posture: bool = True
    prior_task: str = "IDLE_WORK"


class PresenceDirector:
    def __init__(self) -> None:
        self.model = load_model()

    def waiting_plan(self) -> Dict[str, Any]:
        pre = self.model["pre_arrival"]
        return {
            "mode": "waiting",
            "base_state": pre["default_state"],
            "activity_mix": pre["activity_mix"],
            "micro_motion": pre["micro_motion"],
            "rules": pre["rules"],
        }

    def arrival_plan(self, ctx: PresenceContext) -> Dict[str, Any]:
        arrival = self.model["arrival"]
        steps: List[Dict[str, Any]] = []

        if ctx.is_walking:
            steps.append({"step": "DECELERATE_TO_STOP", "reason": "greet_from_stable_footing"})
        if ctx.is_speaking:
            steps.append({"step": "WAIT_FOR_SPEECH_BOUNDARY", "reason": "avoid_mid-word_interruption"})
        if not ctx.stable_posture:
            steps.append({"step": "SETTLE_POSTURE", "reason": "avoid_greeting_mid-transition"})

        steps.extend(arrival["sequence"])
        return {
            "mode": "arrival",
            "event": arrival["event"],
            "steps": steps,
            "greeting_window_ms": arrival["greeting_window_ms"],
            "rules": arrival["rules"],
        }

    def engaged_plan(self) -> Dict[str, Any]:
        engaged = self.model["engaged"]
        return {
            "mode": "engaged",
            "attention": engaged["attention"],
            "micro_motion": engaged["micro_motion"],
            "eye_contact": engaged["eye_contact"],
            "rules": engaged["rules"],
        }

    def departure_plan(self, prior_task: str = "IDLE_WORK") -> Dict[str, Any]:
        departure = self.model["departure"]
        return {
            "mode": "departure",
            "steps": departure["sequence"],
            "resume_delay_ms": departure["resume_delay_ms"],
            "resume_task": prior_task,
        }


if __name__ == "__main__":
    director = PresenceDirector()
    print(json.dumps(director.waiting_plan(), indent=2))
    print(json.dumps(director.arrival_plan(PresenceContext(user_present=True)), indent=2))
