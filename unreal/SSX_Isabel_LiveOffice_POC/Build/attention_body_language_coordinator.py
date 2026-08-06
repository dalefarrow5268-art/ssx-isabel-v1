from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import random
import time


class AttentionState(str, Enum):
    WORK_FOCUS = "WORK_FOCUS"
    USER_ARRIVAL = "USER_ARRIVAL"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    WALKING = "WALKING"
    SCREEN_EXPLAIN = "SCREEN_EXPLAIN"


@dataclass
class PerformanceCue:
    channel: str
    action: str
    target: Optional[str] = None
    delay_ms: int = 0
    duration_ms: Optional[int] = None
    intensity: float = 1.0
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CoordinatorState:
    attention_state: AttentionState = AttentionState.WORK_FOCUS
    primary_target: str = "SCREEN_02"
    moving: bool = False
    speaking: bool = False
    last_blink_at: float = field(default_factory=time.monotonic)
    next_blink_due_s: float = field(default_factory=lambda: random.uniform(2.2, 6.5))
    recent_gestures: List[str] = field(default_factory=list)


class IsabelAttentionCoordinator:
    """High-level performance planner.

    Produces deterministic-enough semantic cues for the Unreal character adapter.
    It does not directly move bones or actors; Control Rig / IK / animation layers
    consume the cues. Randomness is constrained to micro-timing so behavior avoids
    visible metronomic repetition without changing Isabel's intent.
    """

    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)
        self.state = CoordinatorState()

    def transition(self, state: AttentionState, target: Optional[str] = None) -> List[PerformanceCue]:
        self.state.attention_state = state
        if target:
            self.state.primary_target = target

        planners = {
            AttentionState.WORK_FOCUS: self._work_focus,
            AttentionState.USER_ARRIVAL: self._user_arrival,
            AttentionState.LISTENING: self._listening,
            AttentionState.THINKING: self._thinking,
            AttentionState.SPEAKING: self._speaking,
            AttentionState.INTERRUPTED: self._interrupted,
            AttentionState.WALKING: self._walking,
            AttentionState.SCREEN_EXPLAIN: self._screen_explain,
        }
        return planners[state]()

    def tick(self) -> List[PerformanceCue]:
        cues: List[PerformanceCue] = []
        now = time.monotonic()
        elapsed = now - self.state.last_blink_at

        if elapsed >= self.state.next_blink_due_s:
            if self.state.attention_state not in {AttentionState.INTERRUPTED}:
                cues.append(PerformanceCue("face", "blink", intensity=random.uniform(0.85, 1.0)))
                if random.random() < 0.08:
                    cues.append(PerformanceCue("face", "blink", delay_ms=random.randint(120, 220), intensity=0.8))
            self.state.last_blink_at = now
            self.state.next_blink_due_s = random.uniform(2.2, 6.5)

        if self.state.attention_state in {AttentionState.THINKING, AttentionState.WORK_FOCUS} and not self.state.moving:
            if random.random() < 0.03:
                cues.append(PerformanceCue("body", "micro_posture_shift", intensity=random.uniform(0.25, 0.5)))

        return cues

    def set_motion(self, moving: bool) -> None:
        self.state.moving = moving

    def set_speaking(self, speaking: bool) -> None:
        self.state.speaking = speaking

    def emphasis(self, kind: str = "contained") -> List[PerformanceCue]:
        if self.state.moving:
            return []
        gesture = {
            "contained": "contained_hand_emphasis",
            "open": "open_palm",
            "count": "small_counting_emphasis",
        }.get(kind, "contained_hand_emphasis")

        if self._recently_repeated(gesture):
            return [PerformanceCue("head", "small_emphasis_nod", intensity=0.45)]
        self._remember_gesture(gesture)
        return [PerformanceCue("hands", gesture, intensity=0.65)]

    def _work_focus(self) -> List[PerformanceCue]:
        return [
            PerformanceCue("eyes", "look_at", self.state.primary_target, duration_ms=random.randint(1800, 4200)),
            PerformanceCue("body", "working_posture", intensity=0.55),
        ]

    def _user_arrival(self) -> List[PerformanceCue]:
        return [
            PerformanceCue("eyes", "look_at", "USER_FOCUS", delay_ms=random.randint(120, 260)),
            PerformanceCue("head", "follow_gaze", "USER_FOCUS", delay_ms=random.randint(180, 420), intensity=0.75),
            PerformanceCue("body", "upper_body_acknowledge", "USER_FOCUS", delay_ms=random.randint(350, 700), intensity=0.45),
            PerformanceCue("face", "subtle_warm_acknowledgement", delay_ms=random.randint(420, 760), intensity=0.5),
        ]

    def _listening(self) -> List[PerformanceCue]:
        return [
            PerformanceCue("eyes", "look_at", "USER_FOCUS", intensity=0.9),
            PerformanceCue("head", "listening_settle", "USER_FOCUS", intensity=0.45),
            PerformanceCue("body", "quiet_listening_posture", intensity=0.4),
        ]

    def _thinking(self) -> List[PerformanceCue]:
        glance_target = random.choice(["DOWN_NEUTRAL", self.state.primary_target, "USER_FOCUS"])
        return [
            PerformanceCue("eyes", "brief_gaze_break", glance_target, duration_ms=random.randint(220, 650), intensity=0.5),
            PerformanceCue("body", "small_breath", intensity=0.35),
            PerformanceCue("eyes", "return_to", "USER_FOCUS", delay_ms=random.randint(420, 850), intensity=0.85),
        ]

    def _speaking(self) -> List[PerformanceCue]:
        self.state.speaking = True
        return [
            PerformanceCue("eyes", "conversational_eye_contact", "USER_FOCUS", intensity=0.75),
            PerformanceCue("head", "speech_micro_motion", intensity=0.35),
            PerformanceCue("body", "speech_ready_posture", intensity=0.4),
        ]

    def _interrupted(self) -> List[PerformanceCue]:
        self.state.speaking = False
        return [
            PerformanceCue("audio", "stop_speech", delay_ms=0),
            PerformanceCue("hands", "cancel_large_gesture", delay_ms=0),
            PerformanceCue("eyes", "look_at", "USER_FOCUS", delay_ms=60),
            PerformanceCue("head", "settle_to", "USER_FOCUS", delay_ms=100, intensity=0.7),
            PerformanceCue("body", "listening_settle", delay_ms=160, intensity=0.45),
        ]

    def _walking(self) -> List[PerformanceCue]:
        self.state.moving = True
        return [
            PerformanceCue("body", "locomotion_priority", intensity=1.0),
            PerformanceCue("hands", "suppress_large_gestures", intensity=1.0),
            PerformanceCue("eyes", "brief_user_glances_only", "USER_FOCUS", intensity=0.3),
        ]

    def _screen_explain(self) -> List[PerformanceCue]:
        target = self.state.primary_target
        return [
            PerformanceCue("eyes", "look_at", target, delay_ms=0),
            PerformanceCue("head", "follow_gaze", target, delay_ms=90, intensity=0.8),
            PerformanceCue("body", "orient_if_needed", target, delay_ms=180, intensity=0.55),
            PerformanceCue("hands", "screen_open_palm", target, delay_ms=320, intensity=0.65),
            PerformanceCue("eyes", "return_glance_to", "USER_FOCUS", delay_ms=700, intensity=0.8),
        ]

    def _remember_gesture(self, gesture: str) -> None:
        self.state.recent_gestures.append(gesture)
        self.state.recent_gestures = self.state.recent_gestures[-4:]

    def _recently_repeated(self, gesture: str) -> bool:
        return self.state.recent_gestures[-2:].count(gesture) >= 2


def demo_sequence() -> List[Dict[str, Any]]:
    coordinator = IsabelAttentionCoordinator(seed=7)
    sequence: List[Dict[str, Any]] = []
    for state, target in [
        (AttentionState.WORK_FOCUS, "SCREEN_02"),
        (AttentionState.USER_ARRIVAL, "USER_FOCUS"),
        (AttentionState.LISTENING, "USER_FOCUS"),
        (AttentionState.THINKING, "SCREEN_02"),
        (AttentionState.SPEAKING, "USER_FOCUS"),
        (AttentionState.SCREEN_EXPLAIN, "SCREEN_02"),
        (AttentionState.INTERRUPTED, "USER_FOCUS"),
        (AttentionState.LISTENING, "USER_FOCUS"),
    ]:
        cues = coordinator.transition(state, target)
        sequence.append({"state": state.value, "cues": [cue.__dict__ for cue in cues]})
    return sequence


if __name__ == "__main__":
    import json
    print(json.dumps(demo_sequence(), indent=2))
