"""Provider-agnostic voice turn coordinator for Isabel.

This module owns conversational timing, not speech recognition or synthesis quality.
The actual STT/TTS providers plug into these events later.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class TurnState(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"


@dataclass
class TurnContext:
    state: TurnState = TurnState.IDLE
    partial_transcript: str = ""
    final_transcript: str = ""
    response_text: str = ""
    audio_started: bool = False
    behavior_cues: List[Dict[str, Any]] = field(default_factory=list)


class VoiceTurnCoordinator:
    def __init__(self) -> None:
        self.ctx = TurnContext()

    def user_speech_start(self) -> Dict[str, Any]:
        actions: List[Dict[str, Any]] = []
        if self.ctx.state == TurnState.SPEAKING:
            self.ctx.state = TurnState.INTERRUPTED
            actions.extend([
                {"type": "TTS_STOP", "fade_ms": 90},
                {"type": "FACE_MODE", "mode": "INTERRUPTED"},
                {"type": "BODY_MODE", "mode": "LISTEN"},
            ])
        self.ctx.state = TurnState.LISTENING
        self.ctx.partial_transcript = ""
        return {"state": self.ctx.state.value, "actions": actions}

    def user_speech_partial(self, text: str) -> Dict[str, Any]:
        self.ctx.partial_transcript = text
        return {"state": self.ctx.state.value, "partial": text}

    def user_speech_end(self, final_text: str) -> Dict[str, Any]:
        self.ctx.final_transcript = final_text
        self.ctx.state = TurnState.THINKING
        return {
            "state": self.ctx.state.value,
            "actions": [
                {"type": "FACE_MODE", "mode": "THINKING"},
                {"type": "BRAIN_REQUEST", "text": final_text},
            ],
        }

    def brain_response_start(self) -> Dict[str, Any]:
        self.ctx.response_text = ""
        return {"state": self.ctx.state.value}

    def brain_token(self, token: str) -> Dict[str, Any]:
        self.ctx.response_text += token
        return {"state": self.ctx.state.value, "response": self.ctx.response_text}

    def tts_audio_start(self, behavior_cues: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        self.ctx.state = TurnState.SPEAKING
        self.ctx.audio_started = True
        self.ctx.behavior_cues = behavior_cues or []
        return {
            "state": self.ctx.state.value,
            "actions": [
                {"type": "FACE_MODE", "mode": "SPEAKING", "timing_source": "audio"},
                {"type": "BODY_CUES", "cues": self.ctx.behavior_cues},
            ],
        }

    def tts_audio_end(self) -> Dict[str, Any]:
        self.ctx.audio_started = False
        self.ctx.state = TurnState.LISTENING
        return {
            "state": self.ctx.state.value,
            "actions": [
                {"type": "FACE_MODE", "mode": "LISTENING"},
                {"type": "BODY_MODE", "mode": "LISTEN"},
            ],
        }


if __name__ == "__main__":
    c = VoiceTurnCoordinator()
    print(c.user_speech_start())
    print(c.user_speech_partial("Show me the schedule"))
    print(c.user_speech_end("Show me the schedule."))
    print(c.brain_response_start())
    print(c.brain_token("I found "))
    print(c.brain_token("the delay."))
    print(c.tts_audio_start([{"command": "GO_TO_SCREEN_02", "when": "after_sentence_1"}]))
    print(c.tts_audio_end())
