"""End-to-end Isabel live office session orchestration.

This module connects presence, speech, brain intent, behavior planning,
continuity, screen state, and Unreal command dispatch into one deterministic loop.
It remains engine-light until the home AI computer is connected.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List
import time


@dataclass
class SessionState:
    phase: str = "OFFLINE"
    user_present: bool = False
    isabel_mode: str = "IDLE_WORK"
    active_screen: str | None = "SCREEN_02"
    speaking: bool = False
    listening: bool = False
    transcript: str = ""
    last_response: str = ""
    event_log: List[Dict[str, Any]] = field(default_factory=list)

    def log(self, event: str, **data: Any) -> None:
        self.event_log.append({"t": round(time.time(), 3), "event": event, **data})


class SessionOrchestrator:
    def __init__(self) -> None:
        self.state = SessionState()

    def boot(self) -> Dict[str, Any]:
        self.state.phase = "READY"
        self.state.isabel_mode = "IDLE_WORK"
        self.state.active_screen = "SCREEN_02"
        self.state.log("boot_complete", mode=self.state.isabel_mode)
        return self.snapshot()

    def user_arrived(self) -> Dict[str, Any]:
        self.state.user_present = True
        self.state.phase = "ENGAGING"
        self.state.isabel_mode = "LOOK_AT_USER"
        self.state.log("user_arrived")
        return {
            "presence_plan": ["EYES_TO_USER", "HEAD_TO_USER", "UPPER_BODY_ACK", "SOFT_SMILE"],
            "next_phase": "LISTENING",
        }

    def begin_listening(self) -> Dict[str, Any]:
        self.state.phase = "LISTENING"
        self.state.listening = True
        self.state.speaking = False
        self.state.log("listening_started")
        return {"audio_input": "OPEN_MIC", "facial_mode": "ATTENTIVE_LISTEN"}

    def transcript_final(self, text: str) -> Dict[str, Any]:
        self.state.transcript = text.strip()
        self.state.listening = False
        self.state.phase = "THINKING"
        self.state.log("transcript_final", text=self.state.transcript)
        return {
            "brain_input": self.state.transcript,
            "context": {
                "isabel_mode": self.state.isabel_mode,
                "active_screen": self.state.active_screen,
                "user_present": self.state.user_present,
            },
        }

    def brain_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Accept only high-level intent; never raw Unreal transforms/asset paths."""
        speech = str(result.get("speech", "")).strip()
        topic = str(result.get("topic", "general"))
        prefer_move = bool(result.get("prefer_move", False))
        emphasis = str(result.get("emphasis", "normal"))

        screen_for_topic = {
            "overview": "SCREEN_01",
            "schedule": "SCREEN_02",
            "risk": "SCREEN_03",
            "issues": "SCREEN_03",
            "evidence": "SCREEN_04",
            "cameras": "SCREEN_04",
        }.get(topic)

        behavior: List[str] = []
        if prefer_move and screen_for_topic:
            behavior.extend(["STAND_FROM_DESK", f"GO_TO_{screen_for_topic}"])
            self.state.active_screen = screen_for_topic
            self.state.isabel_mode = f"GO_TO_{screen_for_topic}"
        else:
            self.state.isabel_mode = "LOOK_AT_USER"

        self.state.phase = "SPEAKING"
        self.state.speaking = True
        self.state.last_response = speech
        self.state.log(
            "brain_result",
            topic=topic,
            prefer_move=prefer_move,
            emphasis=emphasis,
            screen=self.state.active_screen,
        )

        return {
            "behavior_queue": behavior,
            "speech": speech,
            "performance": {
                "facial_source": "TTS_AUDIO",
                "emotion": self._emotion_for(emphasis),
                "gesture_policy": "RESTRAINED",
                "suppress_large_gestures_while_moving": True,
            },
        }

    def speech_finished(self) -> Dict[str, Any]:
        self.state.speaking = False
        self.state.phase = "LISTENING" if self.state.user_present else "READY"
        self.state.isabel_mode = "LOOK_AT_USER" if self.state.user_present else "IDLE_WORK"
        self.state.log("speech_finished", next_mode=self.state.isabel_mode)
        return {
            "facial_mode": "ATTENTIVE_LISTEN" if self.state.user_present else "NEUTRAL_IDLE",
            "next": "OPEN_MIC" if self.state.user_present else "IDLE_WORK",
        }

    def user_interrupted(self) -> Dict[str, Any]:
        self.state.speaking = False
        self.state.listening = True
        self.state.phase = "LISTENING"
        self.state.isabel_mode = "LOOK_AT_USER"
        self.state.log("user_interrupted")
        return {
            "tts": "FADE_OUT_FAST",
            "face": "RETURN_TO_LISTEN",
            "body": "SETTLE_AND_ATTEND",
            "audio_input": "OPEN_MIC",
        }

    def user_left(self) -> Dict[str, Any]:
        self.state.user_present = False
        self.state.listening = False
        self.state.speaking = False
        self.state.phase = "READY"
        self.state.isabel_mode = "IDLE_WORK"
        self.state.active_screen = "SCREEN_02"
        self.state.log("user_left")
        return {"behavior": "RETURN_TO_IDLE_WORK", "attention": "SCREEN_02"}

    def snapshot(self) -> Dict[str, Any]:
        return {
            "phase": self.state.phase,
            "user_present": self.state.user_present,
            "isabel_mode": self.state.isabel_mode,
            "active_screen": self.state.active_screen,
            "speaking": self.state.speaking,
            "listening": self.state.listening,
            "transcript": self.state.transcript,
            "last_response": self.state.last_response,
            "event_count": len(self.state.event_log),
        }

    @staticmethod
    def _emotion_for(emphasis: str) -> str:
        return {
            "low": "CALM",
            "normal": "WARM_NEUTRAL",
            "high": "FOCUSED_CONFIDENT",
            "urgent": "SERIOUS_CONTROLLED",
        }.get(emphasis, "WARM_NEUTRAL")


if __name__ == "__main__":
    s = SessionOrchestrator()
    print(s.boot())
    print(s.user_arrived())
    print(s.begin_listening())
    print(s.transcript_final("Show me the schedule problem."))
    print(s.brain_result({
        "speech": "There is one schedule issue I want to show you.",
        "topic": "schedule",
        "prefer_move": True,
        "emphasis": "high",
    }))
    print(s.speech_finished())
    print(s.snapshot())
