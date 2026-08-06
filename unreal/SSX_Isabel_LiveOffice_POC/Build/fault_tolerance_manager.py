from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Optional


@dataclass
class FaultState:
    subsystem: str
    severity: str
    status: str
    message: str
    since: str
    last_good: Optional[str] = None
    retry_count: int = 0


class FaultToleranceManager:
    """POC recovery coordinator.

    This module deliberately does not perform external writes. It produces bounded
    recovery instructions that runtime adapters can execute safely.
    """

    FATAL_CONDITIONS = {
        "identity_drift",
        "geometry_drift",
        "unauthorized_action",
        "fabricated_data",
        "false_verification",
    }

    def __init__(self) -> None:
        self.faults: Dict[str, FaultState] = {}

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def fail(self, subsystem: str, severity: str, message: str, last_good: Optional[str] = None) -> FaultState:
        fault = FaultState(
            subsystem=subsystem,
            severity=severity,
            status="active",
            message=message,
            since=self.now(),
            last_good=last_good,
        )
        self.faults[subsystem] = fault
        return fault

    def recover(self, subsystem: str) -> Optional[FaultState]:
        fault = self.faults.get(subsystem)
        if not fault:
            return None
        fault.status = "recovered"
        return fault

    def retry(self, subsystem: str) -> Optional[FaultState]:
        fault = self.faults.get(subsystem)
        if not fault:
            return None
        fault.retry_count += 1
        return fault

    def instruction_for(self, subsystem: str) -> dict:
        instructions = {
            "pixel_streaming": {
                "mode": "browser_shell",
                "actions": ["disable_live_controls", "show_renderer_offline", "retry_webrtc"],
                "preserve": ["continuity_state", "office_session_id"],
            },
            "screen_data": {
                "mode": "screen_fallback",
                "actions": ["retain_physical_screen", "show_last_good_timestamp", "retry_failed_screen_only"],
            },
            "asr": {
                "mode": "typed_or_repeat",
                "actions": ["keep_listening_pose", "request_repeat", "offer_typed_input"],
            },
            "tts": {
                "mode": "text_response",
                "actions": ["show_text", "suppress_lip_sync", "keep_attentive_face"],
            },
            "brain": {
                "mode": "deterministic_safe_commands",
                "actions": ["preserve_state", "reject_partial_plan", "bounded_retry"],
            },
            "navigation": {
                "mode": "stationary_explanation",
                "actions": ["stop_safely", "face_valid_target", "attempt_single_repath", "never_teleport"],
            },
            "facial_performance": {
                "mode": "neutral_attentive",
                "actions": ["disable_broken_face_driver", "retain_eye_head_behavior", "rebind_same_character"],
            },
            "memory": {
                "mode": "session_local",
                "actions": ["disable_durable_writes", "preserve_session_context", "reconcile_on_reconnect"],
            },
            "evidence": {
                "mode": "known_facts_only",
                "actions": ["mark_stale_unknown", "seek_alternate_source", "recompute_after_refresh"],
            },
            "action_execution": {
                "mode": "failed_not_verified",
                "actions": ["record_failure", "retain_exact_payload", "validate_approval_before_retry"],
            },
        }
        return instructions.get(subsystem, {"mode": "safe_hold", "actions": ["preserve_state", "report_fault"]})

    def fatal(self, condition: str, message: str) -> dict:
        if condition not in self.FATAL_CONDITIONS:
            raise ValueError(f"Unknown fatal condition: {condition}")
        return {
            "severity": "FATAL",
            "condition": condition,
            "message": message,
            "actions": [
                "freeze_consequential_actions",
                "preserve_logs",
                "preserve_continuity_snapshot",
                "require_human_review",
            ],
        }

    def snapshot(self) -> dict:
        return {
            "generated_at": self.now(),
            "faults": {name: asdict(fault) for name, fault in self.faults.items()},
        }


if __name__ == "__main__":
    manager = FaultToleranceManager()
    manager.fail("tts", "DEGRADED", "TTS provider timeout")
    print(manager.instruction_for("tts"))
    manager.recover("tts")
    print(manager.snapshot())
