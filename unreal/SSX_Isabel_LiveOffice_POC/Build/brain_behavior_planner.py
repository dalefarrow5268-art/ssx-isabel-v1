"""Translate Isabel brain outputs into coordinated office behavior plans.

The brain should decide WHAT it wants Isabel to communicate. This planner decides
HOW that intent is staged physically in the live office without letting the LLM
control raw coordinates or unsafe animation primitives.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

ALLOWED_ACTIONS = {
    'STAY_SEATED',
    'LOOK_AT_USER',
    'GO_TO_DESK',
    'GO_TO_SCREEN_01',
    'GO_TO_SCREEN_02',
    'GO_TO_SCREEN_03',
    'GO_TO_SCREEN_04',
    'SIT_AT_DESK',
    'STAND_FROM_DESK',
    'IDLE_WORK',
}

SCREEN_BY_TOPIC = {
    'overview': 'GO_TO_SCREEN_01',
    'project_overview': 'GO_TO_SCREEN_01',
    'schedule': 'GO_TO_SCREEN_02',
    'milestone': 'GO_TO_SCREEN_02',
    'delay': 'GO_TO_SCREEN_02',
    'risk': 'GO_TO_SCREEN_03',
    'issue': 'GO_TO_SCREEN_03',
    'issues': 'GO_TO_SCREEN_03',
    'camera': 'GO_TO_SCREEN_04',
    'evidence': 'GO_TO_SCREEN_04',
    'photo': 'GO_TO_SCREEN_04',
}


@dataclass
class BrainIntent:
    speech: str
    topic: Optional[str] = None
    show_screen: Optional[str] = None
    emphasis: str = 'normal'
    prefer_move: bool = False
    return_to_desk: bool = False


@dataclass
class BehaviorPlan:
    speech: str
    actions: List[str]
    screen_focus: Optional[str]
    gesture_policy: str
    notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _screen_action(intent: BrainIntent) -> Optional[str]:
    if intent.show_screen:
        key = intent.show_screen.strip().upper()
        if key in {'SCREEN_01', 'SCREEN_02', 'SCREEN_03', 'SCREEN_04'}:
            return f'GO_TO_{key}'
    if intent.topic:
        return SCREEN_BY_TOPIC.get(intent.topic.strip().lower())
    return None


def plan(intent: BrainIntent, current_state: Dict[str, Any]) -> BehaviorPlan:
    actions: List[str] = []
    notes: List[str] = []
    screen_action = _screen_action(intent)

    posture = current_state.get('posture', 'SEATED')
    anchor = current_state.get('anchor', 'ISABEL_DESK_SEATED')

    if screen_action and intent.prefer_move:
        if posture == 'SEATED':
            actions.append('STAND_FROM_DESK')
        actions.append(screen_action)
        notes.append('Movement chosen because brain intent requested a visual explanation.')
    else:
        actions.append('LOOK_AT_USER')
        if screen_action:
            notes.append('Topic mapped to a screen, but Isabel stays conversational unless movement is useful.')

    if intent.return_to_desk and screen_action and intent.prefer_move:
        actions.extend(['GO_TO_DESK', 'SIT_AT_DESK'])

    # Safety: planner may only emit named high-level behaviors.
    actions = [a for a in actions if a in ALLOWED_ACTIONS]
    if not actions:
        actions = ['LOOK_AT_USER']

    focus = None
    if screen_action:
        focus = screen_action.replace('GO_TO_', '')

    gesture_policy = 'restrained'
    if intent.emphasis in {'high', 'critical'} and screen_action:
        gesture_policy = 'point_once_when_stable'
    elif intent.emphasis == 'low':
        gesture_policy = 'minimal'

    return BehaviorPlan(
        speech=intent.speech,
        actions=actions,
        screen_focus=focus,
        gesture_policy=gesture_policy,
        notes=notes + [f'Planned from anchor={anchor}, posture={posture}.'],
    )


if __name__ == '__main__':
    demo = BrainIntent(
        speech='There is a schedule issue I want to show you.',
        topic='schedule',
        emphasis='high',
        prefer_move=True,
        return_to_desk=False,
    )
    state = {'anchor': 'ISABEL_DESK_SEATED', 'posture': 'SEATED'}
    print(plan(demo, state).to_dict())
