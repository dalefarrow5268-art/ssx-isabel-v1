from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / "speech_face_coordinator.json"


@dataclass
class PerformanceState:
    mode: str = "LISTENING"
    speaking: bool = False
    locomoting: bool = False
    current_emotion: str = "neutral_warm"


class SpeechFaceCoordinator:
    def __init__(self) -> None:
        self.spec: Dict[str, Any] = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
        self.state = PerformanceState()

    def set_locomotion(self, active: bool) -> Dict[str, Any]:
        self.state.locomoting = active
        return {"locomoting": active, "body_gestures_allowed": not active}

    def begin_listening(self) -> Dict[str, Any]:
        self.state.mode = "LISTENING"
        self.state.speaking = False
        return {"mode": "LISTENING", **self.spec["speech_states"]["LISTENING"]}

    def begin_thinking(self) -> Dict[str, Any]:
        self.state.mode = "THINKING"
        self.state.speaking = False
        return {"mode": "THINKING", **self.spec["speech_states"]["THINKING"]}

    def begin_speaking(self, audio_id: str, emotion: str = "neutral_warm") -> Dict[str, Any]:
        self.state.mode = "SPEAKING"
        self.state.speaking = True
        self.state.current_emotion = emotion
        plan = {"mode": "SPEAKING", **self.spec["speech_states"]["SPEAKING"]}
        plan.update({
            "audio_id": audio_id,
            "emotion": emotion,
            "body_gestures_allowed": not self.state.locomoting,
        })
        return plan

    def interrupt(self) -> Dict[str, Any]:
        self.state.mode = "INTERRUPTED"
        self.state.speaking = False
        return {"mode": "INTERRUPTED", **self.spec["speech_states"]["INTERRUPTED"]}

    def complete_speech(self) -> Dict[str, Any]:
        return self.begin_listening()


if __name__ == "__main__":
    c = SpeechFaceCoordinator()
    print(json.dumps(c.begin_listening(), indent=2))
    print(json.dumps(c.begin_thinking(), indent=2))
    print(json.dumps(c.begin_speaking("demo-audio-001", "welcoming"), indent=2))
    print(json.dumps(c.complete_speech(), indent=2))
