"""Proactive office-work planner for Isabel.

This module selects useful, interruptible work while no user is actively
engaging Isabel. It produces high-level actions only; the Unreal runtime
adapter remains responsible for navigation, animation, gaze and screen focus.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class OfficeContext:
    user_present: bool = False
    voice_active: bool = False
    unresolved_commitments: int = 0
    schedule_exceptions: int = 0
    risk_changes: int = 0
    new_evidence_items: int = 0
    seconds_since_large_move: float = 999.0
    seconds_since_screen_walk: float = 999.0
    last_activity: Optional[str] = None
    repeated_activity_count: int = 0


@dataclass
class WorkPlan:
    state: str
    activity: str
    anchor: str
    screen: Optional[str] = None
    reason: str = ""
    interruptible: bool = True
    external_side_effects: bool = False


class ProactiveOfficeCoordinator:
    """Select high-value autonomous work without crossing authority boundaries."""

    DESK = "ISABEL_DESK_SEATED"

    def choose(self, ctx: OfficeContext) -> WorkPlan:
        if ctx.user_present or ctx.voice_active:
            return WorkPlan(
                state="USER_ARRIVAL",
                activity="acknowledge_user",
                anchor=self.DESK,
                reason="User presence overrides autonomous work.",
            )

        if ctx.unresolved_commitments > 0:
            return self._plan(
                state="OPEN_COMMITMENT_CHECK",
                activity="check_unresolved_promises",
                anchor=self.DESK,
                screen="SCREEN_02",
                reason="Open commitments have highest autonomous priority.",
                ctx=ctx,
            )

        if ctx.schedule_exceptions > 0:
            return self._plan(
                state="PRE_ARRIVAL_REVIEW",
                activity="review_schedule_exceptions",
                anchor="SCREEN_02_VIEW",
                screen="SCREEN_02",
                reason="Schedule exceptions merit pre-arrival review.",
                ctx=ctx,
            )

        if ctx.risk_changes > 0:
            return self._plan(
                state="SCREEN_REVIEW",
                activity="inspect_new_alerts",
                anchor="SCREEN_03_VIEW",
                screen="SCREEN_03",
                reason="Risk changes are useful to stage before the user arrives.",
                ctx=ctx,
            )

        if ctx.new_evidence_items > 0:
            return self._plan(
                state="SCREEN_REVIEW",
                activity="organize_evidence_links",
                anchor="SCREEN_04_VIEW",
                screen="SCREEN_04",
                reason="New evidence should be linked and staged, not acted on externally.",
                ctx=ctx,
            )

        return self._plan(
            state="DESK_WORK",
            activity="summarize_current_context",
            anchor=self.DESK,
            reason="No urgent exception exists; stay productive at the desk.",
            ctx=ctx,
        )

    def _plan(
        self,
        *,
        state: str,
        activity: str,
        anchor: str,
        reason: str,
        ctx: OfficeContext,
        screen: Optional[str] = None,
    ) -> WorkPlan:
        # Avoid robotic repetition: fall back to a neutral desk task after two repeats.
        if ctx.last_activity == activity and ctx.repeated_activity_count >= 2:
            return WorkPlan(
                state="DESK_WORK",
                activity="prepare_questions_for_user",
                anchor=self.DESK,
                reason="Repetition guard selected a different useful task.",
            )

        # Purposeful movement only. If she moved recently, stage the same work from desk.
        requires_walk = anchor != self.DESK
        if requires_walk and (
            ctx.seconds_since_large_move < 18.0 or ctx.seconds_since_screen_walk < 45.0
        ):
            return WorkPlan(
                state="DESK_WORK",
                activity=f"stage_{activity}",
                anchor=self.DESK,
                screen=screen,
                reason=f"{reason} Movement suppressed to avoid pacing; context is staged from desk.",
            )

        return WorkPlan(
            state=state,
            activity=activity,
            anchor=anchor,
            screen=screen,
            reason=reason,
        )

    @staticmethod
    def micro_behavior(posture: str, seed: int = 0) -> Dict[str, object]:
        seated: List[str] = [
            "small_posture_shift",
            "brief_monitor_glance",
            "mouse_hand_movement",
            "subtle_typing_burst",
            "blink_breathe",
            "short_note_gesture",
        ]
        standing: List[str] = [
            "weight_shift",
            "brief_hand_rest",
            "screen_glance",
            "small_head_turn",
            "blink_breathe",
        ]
        options = seated if posture.upper() == "SEATED" else standing
        cue = options[seed % len(options)]
        return {
            "cue": cue,
            "loop": False,
            "intensity": "subtle",
            "interruptible": True,
        }

    @staticmethod
    def authority_allows(action: str) -> bool:
        safe = {
            "read",
            "compare",
            "summarize",
            "rank",
            "prepare_draft",
            "prepare_recommendation",
            "preload_screen",
            "update_transient_runtime_context",
        }
        return action in safe


if __name__ == "__main__":
    coordinator = ProactiveOfficeCoordinator()
    demo = OfficeContext(schedule_exceptions=2)
    print(coordinator.choose(demo))
