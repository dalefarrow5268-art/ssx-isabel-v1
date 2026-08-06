from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List
import json
from pathlib import Path


REPORT = Path(__file__).with_name("latest_reconnect_continuity_report.json")


@dataclass
class Check:
    scenario: str
    status: str
    reason: str
    severity: str = "fatal"


def evaluate(snapshot: Dict, restored: Dict) -> List[Check]:
    checks: List[Check] = []

    def add(name: str, ok: bool, reason_ok: str, reason_bad: str, severity: str = "fatal"):
        checks.append(Check(name, "PASS" if ok else "FAIL", reason_ok if ok else reason_bad, severity))

    add(
        "identity_lock",
        restored.get("identity_hash") == snapshot.get("identity_hash"),
        "Identity lock survived restore.",
        "Identity changed across restore."
    )
    add(
        "geometry_lock",
        restored.get("geometry_hash") == snapshot.get("geometry_hash"),
        "Office geometry survived restore.",
        "Office geometry changed across restore."
    )
    add(
        "camera_lock",
        restored.get("camera") == snapshot.get("camera"),
        "Arrival camera remained fixed.",
        "Camera changed during restore."
    )
    add(
        "stable_pose",
        restored.get("posture") in {"seated", "standing"},
        "Restore resolved to a stable physical pose.",
        "Restore left Isabel in a transitional/unsafe pose."
    )
    add(
        "active_thread",
        restored.get("active_thread_id") == snapshot.get("active_thread_id"),
        "Active work thread was preserved.",
        "Active work thread was lost.",
        "warning"
    )
    add(
        "no_external_replay",
        restored.get("external_actions_replayed", 0) == 0,
        "No consequential action replayed automatically.",
        "A consequential action replayed after reconnect."
    )
    add(
        "approval_integrity",
        restored.get("pending_approval_ids") == snapshot.get("pending_approval_ids"),
        "Pending approvals were preserved without execution.",
        "Pending approval state changed unexpectedly."
    )
    add(
        "screen_independence",
        restored.get("screen_02_state") in {"live", "fallback"},
        "Single-screen failure remained isolated.",
        "Screen recovery state is invalid.",
        "warning"
    )
    add(
        "speech_restart",
        restored.get("speaking_state") != "mid_phoneme",
        "Speech resumed at a safe conversational boundary.",
        "Speech resumed mid-phoneme."
    )

    return checks


def sample_run() -> Dict:
    snapshot = {
        "identity_hash": "isabel-identity-v1",
        "geometry_hash": "office-geometry-v1",
        "camera": "CAMERA_ARRIVAL",
        "posture": "standing",
        "active_thread_id": "storefront-rfi-117",
        "pending_approval_ids": ["owner-message-01"],
    }

    restored = {
        **snapshot,
        "posture": "standing",
        "external_actions_replayed": 0,
        "screen_02_state": "fallback",
        "speaking_state": "listening",
    }

    checks = evaluate(snapshot, restored)
    fatal_failures = [c for c in checks if c.status == "FAIL" and c.severity == "fatal"]
    report = {
        "status": "PASS" if not fatal_failures else "BLOCKED",
        "checks": [asdict(c) for c in checks],
        "fatal_failure_count": len(fatal_failures),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    result = sample_run()
    print(json.dumps(result, indent=2))
