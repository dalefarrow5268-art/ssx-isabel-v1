from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


TOPIC_TO_SCREEN = {
    "schedule": "SCREEN_02",
    "risk": "SCREEN_03",
    "evidence": "SCREEN_04",
    "overview": "SCREEN_01",
}


@dataclass
class Prediction:
    topic: Optional[str]
    confidence: float
    screen: Optional[str]
    preparations: List[str]
    committed_actions: List[str]
    cancelled: bool = False

    def to_dict(self) -> Dict:
        return asdict(self)


class AnticipationPlanner:
    """Prepare likely context early while keeping uncertain actions reversible."""

    def __init__(self):
        self.active: Optional[Prediction] = None

    @staticmethod
    def _band(confidence: float) -> str:
        if confidence < 0.50:
            return "low"
        if confidence < 0.75:
            return "medium"
        if confidence < 0.95:
            return "high"
        return "authoritative"

    def predict(self, topic: Optional[str], confidence: float) -> Prediction:
        confidence = max(0.0, min(1.0, confidence))
        screen = TOPIC_TO_SCREEN.get(topic or "")
        band = self._band(confidence)
        preparations: List[str] = ["eyes_acknowledge_user"]
        committed: List[str] = []

        if band == "low":
            preparations += ["listen_only"]
        elif band == "medium":
            preparations += ["prefetch_relevant_context"]
            if screen:
                preparations += [f"preload_{screen}"]
        elif band == "high":
            preparations += ["prefetch_relevant_context", "soft_body_orientation"]
            if screen:
                preparations += [f"preload_{screen}", f"soft_gaze_{screen}"]
        else:
            preparations += ["prefetch_relevant_context", "soft_body_orientation"]
            if screen:
                preparations += [f"preload_{screen}", f"soft_gaze_{screen}"]
            # Even authoritative predictions do not bypass external-action policy.
            committed += ["ready_for_confirmed_behavior"]

        self.active = Prediction(topic, confidence, screen, preparations, committed)
        return self.active

    def confirm_user_intent(self) -> Prediction:
        if not self.active:
            return Prediction(None, 0.0, None, [], [])
        if self.active.confidence >= 0.75 and self.active.screen:
            self.active.committed_actions.append(f"allow_go_to_{self.active.screen}")
        self.active.committed_actions.append("allow_speech_response")
        return self.active

    def contradict(self, new_topic: Optional[str]) -> Prediction:
        if not self.active:
            return Prediction(None, 0.0, None, [], [])
        if new_topic != self.active.topic:
            self.active.confidence *= 0.35
            self.active.preparations.append("cancel_stale_preload")
            self.active.committed_actions = []
        return self.active

    def barge_in(self) -> Prediction:
        if not self.active:
            return Prediction(None, 0.0, None, [], [], cancelled=True)
        self.active.cancelled = True
        self.active.preparations += [
            "cancel_uncommitted_prediction",
            "stop_pending_body_move_if_safe",
            "return_attention_to_user",
        ]
        self.active.committed_actions = []
        return self.active


if __name__ == "__main__":
    planner = AnticipationPlanner()
    first = planner.predict("schedule", 0.82)
    print("PREDICT", first.to_dict())
    confirmed = planner.confirm_user_intent()
    print("CONFIRM", confirmed.to_dict())
    interrupted = planner.barge_in()
    print("BARGE_IN", interrupted.to_dict())
