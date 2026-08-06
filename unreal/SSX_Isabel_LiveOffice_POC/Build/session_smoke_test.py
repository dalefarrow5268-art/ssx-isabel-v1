from session_orchestrator import SessionOrchestrator


def run():
    s = SessionOrchestrator()
    steps = []
    steps.append(("boot", s.boot()))
    steps.append(("arrival", s.user_arrived()))
    steps.append(("listen", s.begin_listening()))
    steps.append(("transcript", s.transcript_final("Show me the schedule problem.")))
    steps.append(("brain", s.brain_result({
        "speech": "There is one schedule issue I want to show you.",
        "topic": "schedule",
        "prefer_move": True,
        "emphasis": "high",
    })))
    steps.append(("speech_finished", s.speech_finished()))

    snapshot = s.snapshot()
    assert snapshot["phase"] == "LISTENING"
    assert snapshot["user_present"] is True
    assert snapshot["active_screen"] == "SCREEN_02"
    assert snapshot["speaking"] is False

    return {"ok": True, "steps": steps, "snapshot": snapshot}


if __name__ == "__main__":
    print(run())
