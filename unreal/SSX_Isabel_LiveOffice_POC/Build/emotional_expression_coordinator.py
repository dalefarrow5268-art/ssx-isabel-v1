"""Contextual emotional-performance coordinator for Isabel.

This module selects a restrained emotional mode from semantic context and emits
high-level performance cues. Unreal/Control Rig adapters consume the cues; this
module never changes character identity, raw facial topology, or office geometry.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
import json
import time

HERE = Path(__file__).resolve().parent
SPEC_PATH = HERE / "emotional_expression_spec.json"


@dataclass
class EmotionalCue:
    mode: str
    face: dict
    voice: dict
    body: dict
    transition_ms: int
    reason: str
    issued_at: float


def load_spec() -> dict:
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def _clamp_transition(spec: dict, requested: int) -> int:
    rules = spec["transition_rules"]
    return max(rules["minimum_transition_ms"], min(rules["maximum_transition_ms"], requested))


def select_mode(context: str, *, explicit_mode: str | None = None) -> str:
    spec = load_spec()
    states = spec["expression_states"]
    if explicit_mode:
        if explicit_mode not in states:
            raise ValueError(f"Unknown emotional mode: {explicit_mode}")
        return explicit_mode
    return spec["context_mapping"].get(context, "NEUTRAL_PROFESSIONAL")


def build_cue(
    context: str,
    *,
    explicit_mode: str | None = None,
    transition_ms: int = 420,
    reason: str = "context",
) -> EmotionalCue:
    spec = load_spec()
    mode = select_mode(context, explicit_mode=explicit_mode)
    state = spec["expression_states"][mode]
    return EmotionalCue(
        mode=mode,
        face=state["face"],
        voice=state["voice"],
        body=state["body"],
        transition_ms=_clamp_transition(spec, transition_ms),
        reason=reason,
        issued_at=time.time(),
    )


def reconcile(
    previous_mode: str,
    new_context: str,
    *,
    interrupted: bool = False,
    strong_override: bool = False,
) -> EmotionalCue:
    """Preserve continuity unless context clearly requires a change."""
    spec = load_spec()
    target = select_mode(new_context)

    if interrupted and not strong_override:
        # A quick interruption should not make Isabel emotionally snap to another face.
        target = previous_mode if previous_mode in spec["expression_states"] else target
        reason = "interrupt_continuity"
        transition = 260
    elif target == previous_mode:
        reason = "hold_mode"
        transition = 220
    else:
        reason = "context_transition"
        transition = 520

    return build_cue(
        new_context,
        explicit_mode=target,
        transition_ms=transition,
        reason=reason,
    )


def validate_cue(cue: EmotionalCue) -> list[str]:
    """Return quality violations; empty list means the cue passes basic guards."""
    issues: list[str] = []

    if cue.mode in {"CONCERNED", "SERIOUS_BOUNDARY"} and cue.face.get("smile", 0) > 0.12:
        issues.append("serious mode smile is too strong")
    if cue.face.get("brow_knit", 0) > 0.40:
        issues.append("brow animation exceeds restrained professional limit")
    if cue.body.get("gesture_rate", 0) > 0.40:
        issues.append("gesture rate is too high for Isabel baseline")
    if cue.voice.get("energy", 0) > 0.85:
        issues.append("voice energy is too theatrical")

    return issues


def demo() -> None:
    sequence = [
        ("user_arrival", False),
        ("routine_work", False),
        ("analyzing_data", False),
        ("risk_or_problem", False),
        ("explaining_screen", False),
        ("explaining_screen", True),
        ("good_news", False),
    ]
    previous = "NEUTRAL_PROFESSIONAL"
    for context, interrupted in sequence:
        cue = reconcile(previous, context, interrupted=interrupted)
        print(json.dumps(asdict(cue), indent=2))
        problems = validate_cue(cue)
        if problems:
            print("WARN:", "; ".join(problems))
        previous = cue.mode


if __name__ == "__main__":
    demo()
