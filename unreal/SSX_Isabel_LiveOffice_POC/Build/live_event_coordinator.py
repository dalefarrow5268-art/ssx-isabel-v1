"""Isabel live situational-awareness coordinator.

This module is renderer/provider agnostic. It converts incoming project/office
signals into calm, reversible internal actions and high-level Unreal behavior
requests. It never directly performs consequential external actions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple
import time


PRIORITIES = {
    "SCHEDULE_CHANGE": 60,
    "RISK_INCREASE": 75,
    "EVIDENCE_ARRIVAL": 45,
    "MEETING_APPROACHING": 55,
    "COMMITMENT_DUE": 70,
    "DATA_STALE": 35,
    "SCREEN_RECOVERED": 20,
    "USER_ARRIVAL": 90,
    "CRITICAL_SAFETY_OR_PROJECT_EVENT": 100,
}

SCREEN_BY_TYPE = {
    "SCHEDULE_CHANGE": "SCREEN_02",
    "RISK_INCREASE": "SCREEN_03",
    "EVIDENCE_ARRIVAL": "SCREEN_04",
    "MEETING_APPROACHING": "SCREEN_01",
    "COMMITMENT_DUE": "SCREEN_01",
    "CRITICAL_SAFETY_OR_PROJECT_EVENT": "SCREEN_03",
}


@dataclass
class LiveEvent:
    event_type: str
    project_id: str
    topic: str
    source_object_id: str
    confidence: float = 1.0
    time_urgency: float = 0.5
    project_impact: float = 0.5
    user_relevance: float = 0.5
    verified: bool = False
    payload: Dict[str, Any] = field(default_factory=dict)
    received_at: float = field(default_factory=time.time)


@dataclass
class OfficeContext:
    user_present: bool = False
    user_speaking: bool = False
    isabel_speaking: bool = False
    isabel_walking: bool = False
    current_activity: str = "IDLE_WORK"
    current_screen: Optional[str] = None


@dataclass
class EventPlan:
    score: int
    band: str
    event_key: Tuple[str, str, str]
    actions: List[Dict[str, Any]]
    should_interrupt: bool = False
    spoken_summary_allowed: bool = True


class LiveEventCoordinator:
    """Prioritize live signals and convert them into reversible office actions."""

    def __init__(self, dedupe_window_seconds: int = 120) -> None:
        self.dedupe_window_seconds = dedupe_window_seconds
        self._last_seen: Dict[Tuple[str, str, str], LiveEvent] = {}
        self._queued: List[Tuple[int, LiveEvent]] = []

    @staticmethod
    def _clamp01(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    def score(self, event: LiveEvent) -> int:
        base = PRIORITIES.get(event.event_type, 40) / 100.0
        weighted = (
            base * 0.35
            + self._clamp01(event.time_urgency) * 0.20
            + self._clamp01(event.project_impact) * 0.25
            + self._clamp01(event.confidence) * 0.10
            + self._clamp01(event.user_relevance) * 0.10
        )
        return round(weighted * 100)

    @staticmethod
    def band(score: int) -> str:
        if score >= 90:
            return "interrupt_if_necessary"
        if score >= 70:
            return "surface_promptly"
        if score >= 50:
            return "surface_when_natural"
        if score >= 30:
            return "prepare_quietly"
        return "background_only"

    @staticmethod
    def key(event: LiveEvent) -> Tuple[str, str, str]:
        return (event.project_id, event.topic, event.source_object_id)

    def is_duplicate(self, event: LiveEvent) -> bool:
        key = self.key(event)
        previous = self._last_seen.get(key)
        if not previous:
            self._last_seen[key] = event
            return False
        if event.received_at - previous.received_at > self.dedupe_window_seconds:
            self._last_seen[key] = event
            return False
        # A newer verified event is allowed through because it can supersede
        # an earlier tentative signal.
        if event.verified and not previous.verified:
            self._last_seen[key] = event
            return False
        return True

    def plan(self, event: LiveEvent, context: OfficeContext) -> EventPlan:
        score = self.score(event)
        band = self.band(score)
        actions: List[Dict[str, Any]] = []
        preferred_screen = SCREEN_BY_TYPE.get(event.event_type)

        if event.event_type == "DATA_STALE":
            actions.extend([
                {"type": "mark_data_stale", "project_id": event.project_id, "topic": event.topic},
                {"type": "preserve_last_good_value"},
            ])
            return EventPlan(
                score=score,
                band=band,
                event_key=self.key(event),
                actions=actions,
                should_interrupt=False,
                spoken_summary_allowed=False,
            )

        if preferred_screen:
            actions.append({"type": "preload_screen", "screen": preferred_screen, "reversible": True})

        actions.append({"type": "update_internal_work_queue", "event_type": event.event_type})

        # Human-like attention behavior: conversation beats background motion.
        if context.user_speaking and score < 90:
            actions.append({"type": "hold_visible_reaction_until_user_finishes"})
        elif context.isabel_speaking and score < 90:
            actions.append({"type": "queue_until_phrase_boundary"})
        elif context.isabel_walking and score < 90:
            actions.append({"type": "finish_or_stabilize_current_walk"})
        elif preferred_screen and score >= 50:
            actions.append({"type": "subtle_attention_shift", "target": preferred_screen})

        if score >= 70:
            actions.append({"type": "prepare_concise_brief", "verified_only": True})
        else:
            actions.append({"type": "prepare_context_silently"})

        should_interrupt = score >= 90 and event.verified
        if score >= 90 and not event.verified:
            actions.insert(0, {"type": "verify_source_before_interrupt"})

        if should_interrupt:
            actions.extend([
                {"type": "stop_nonessential_action"},
                {"type": "direct_eye_contact"},
                {"type": "surface_plain_language_alert"},
                {"type": "request_human_authority_if_action_required"},
            ])

        return EventPlan(
            score=score,
            band=band,
            event_key=self.key(event),
            actions=actions,
            should_interrupt=should_interrupt,
            spoken_summary_allowed=event.event_type != "DATA_STALE",
        )

    def ingest(self, event: LiveEvent, context: OfficeContext) -> Optional[EventPlan]:
        if self.is_duplicate(event):
            return None
        plan = self.plan(event, context)
        self._queued.append((plan.score, event))
        self._queued.sort(key=lambda item: item[0], reverse=True)
        return plan

    def top_pending(self, limit: int = 5) -> Iterable[LiveEvent]:
        return [event for _, event in self._queued[:limit]]

    def on_user_arrival(self, active_background_work: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return [
            {"type": "preserve_background_work", "state": active_background_work or {}},
            {"type": "stabilize_body_if_moving"},
            {"type": "behavior", "state": "LOOK_AT_USER"},
            {"type": "prepare_return_brief_from_top_pending", "limit": 3},
        ]


def demo() -> None:
    coordinator = LiveEventCoordinator()
    context = OfficeContext(user_present=True, user_speaking=True, current_activity="LISTENING")
    event = LiveEvent(
        event_type="RISK_INCREASE",
        project_id="DEMO-PROJECT",
        topic="storefront anchorage",
        source_object_id="RFI-117",
        confidence=0.95,
        time_urgency=0.8,
        project_impact=0.9,
        user_relevance=0.9,
        verified=True,
    )
    plan = coordinator.ingest(event, context)
    print(plan)


if __name__ == "__main__":
    demo()
