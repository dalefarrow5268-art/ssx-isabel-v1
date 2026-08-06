"""Latency instrumentation for Isabel's live interaction loop.

This is provider-agnostic and can run before all providers are connected. Runtime
adapters call mark() at key events; finalize_turn() emits a structured report.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

ROOT = Path(__file__).resolve().parent
BUDGET = json.loads((ROOT / "latency_budget.json").read_text(encoding="utf-8"))
REPORT = ROOT / "latest_latency_report.json"


@dataclass
class LatencyTurn:
    turn_id: str
    marks: Dict[str, float] = field(default_factory=dict)

    def mark(self, name: str) -> None:
        self.marks[name] = time.perf_counter()

    def duration_ms(self, start: str, end: str) -> Optional[float]:
        if start not in self.marks or end not in self.marks:
            return None
        return round((self.marks[end] - self.marks[start]) * 1000, 1)

    def summarize(self) -> Dict[str, object]:
        metrics = {
            "voice_onset_detection_ms": self.duration_ms("user_voice_start", "voice_detected"),
            "partial_transcript_ms": self.duration_ms("user_voice_start", "partial_transcript"),
            "brain_first_token_ms": self.duration_ms("transcript_final", "brain_first_token"),
            "tts_first_audio_ms": self.duration_ms("tts_requested", "tts_first_audio"),
            "face_after_audio_ms": self.duration_ms("tts_first_audio", "face_motion_start"),
            "end_of_user_speech_to_isabel_audio_ms": self.duration_ms("user_voice_end", "tts_first_audio"),
            "barge_in_voice_fade_ms": self.duration_ms("barge_in_detected", "isabel_audio_stopped"),
            "screen_command_ack_ms": self.duration_ms("screen_command_sent", "screen_command_ack"),
            "navigation_start_ms": self.duration_ms("navigation_requested", "navigation_started"),
        }
        ideal = BUDGET["targets_ms"]["ideal_end_of_user_speech_to_isabel_audio"]
        maximum = BUDGET["targets_ms"]["maximum_acceptable_end_of_user_speech_to_isabel_audio"]
        response = metrics["end_of_user_speech_to_isabel_audio_ms"]
        if response is None:
            grade = "INCOMPLETE"
        elif response <= ideal:
            grade = "WORLD_CLASS_TARGET"
        elif response <= maximum:
            grade = "ACCEPTABLE_POC"
        else:
            grade = "TOO_SLOW"
        return {"turn_id": self.turn_id, "grade": grade, "metrics_ms": metrics}


def finalize_turn(turn: LatencyTurn) -> Dict[str, object]:
    summary = turn.summarize()
    REPORT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    # Synthetic smoke path; real timestamps replace these on Saturday.
    t = LatencyTurn("synthetic-latency-smoke")
    t.mark("user_voice_start")
    time.sleep(0.03)
    t.mark("voice_detected")
    t.mark("partial_transcript")
    t.mark("user_voice_end")
    t.mark("transcript_final")
    time.sleep(0.04)
    t.mark("brain_first_token")
    t.mark("tts_requested")
    time.sleep(0.03)
    t.mark("tts_first_audio")
    time.sleep(0.01)
    t.mark("face_motion_start")
    print(json.dumps(finalize_turn(t), indent=2))
