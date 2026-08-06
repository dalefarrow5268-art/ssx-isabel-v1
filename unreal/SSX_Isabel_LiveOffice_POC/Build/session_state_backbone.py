"""Isabel production session/state backbone.

This POC module is intentionally transport-agnostic. Browser, Unreal, voice,
screen, memory, and orchestration adapters can all publish domain-owned patches
through the same versioned state store.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import threading
import uuid

ROOT = Path(__file__).resolve().parent
STATE_PATH = ROOT / "latest_session_state.json"

PROTECTED_PATHS = {
    "identity.identity_lock",
    "identity.face_lock",
    "identity.hair_lock",
    "identity.proportion_lock",
    "physical.active_camera",
    "execution.replay_allowed",
}

OWNER_PREFIXES = {
    "browser": ("session.connection_epoch", "health.browser", "conversation.user_speaking"),
    "unreal": ("physical.", "health.unreal", "health.navigation", "health.pixel_streaming"),
    "voice": ("conversation.partial_transcript", "conversation.final_transcript", "conversation.isabel_speaking", "health.voice_asr", "health.voice_tts"),
    "screen_runtime": ("screens.", "health.screens"),
    "memory_runtime": ("memory.", "health.memory"),
    "orchestrator": ("session.mode", "work.", "approvals.", "execution.", "conversation.response_status", "conversation.emotion_mode"),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def payload_hash(payload) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def default_state() -> dict:
    return {
        "session": {
            "session_id": str(uuid.uuid4()),
            "state_version": 0,
            "started_at": now_iso(),
            "updated_at": now_iso(),
            "connection_epoch": 0,
            "mode": "BOOTING",
        },
        "identity": {
            "character_id": "ISABEL_CHARACTER",
            "identity_lock": True,
            "face_lock": True,
            "hair_lock": True,
            "proportion_lock": True,
        },
        "physical": {
            "stable_anchor": "ISABEL_DESK_SEATED",
            "target_anchor": None,
            "posture": "SEATED",
            "attention_target": "SCREEN_02",
            "active_camera": "CAMERA_ARRIVAL",
            "transition_id": None,
            "transition_started_at": None,
        },
        "conversation": {
            "turn_id": None,
            "user_speaking": False,
            "isabel_speaking": False,
            "partial_transcript": "",
            "final_transcript": "",
            "response_status": "IDLE",
            "emotion_mode": "BASELINE",
        },
        "screens": {
            "SCREEN_01": {"route": "/screens/project-overview", "status": "WAITING", "last_good_url": None},
            "SCREEN_02": {"route": "/screens/schedule", "status": "WAITING", "last_good_url": None},
            "SCREEN_03": {"route": "/screens/risk", "status": "WAITING", "last_good_url": None},
            "SCREEN_04": {"route": "/screens/evidence", "status": "WAITING", "last_good_url": None},
        },
        "work": {
            "active_project_id": None,
            "active_thread_id": None,
            "current_task": None,
            "open_commitments": [],
            "prepared_artifacts": [],
        },
        "memory": {
            "availability": "UNKNOWN",
            "session_context": {},
            "approved_memory_refs": [],
            "proposed_memory_refs": [],
        },
        "approvals": {"pending": [], "approved": [], "expired": []},
        "execution": {
            "in_flight_action": None,
            "last_action_result": None,
            "last_verified_result": None,
            "replay_allowed": False,
        },
        "health": {
            "browser": "UNKNOWN",
            "pixel_streaming": "UNKNOWN",
            "unreal": "UNKNOWN",
            "voice_asr": "UNKNOWN",
            "voice_tts": "UNKNOWN",
            "memory": "UNKNOWN",
            "screens": "UNKNOWN",
            "navigation": "UNKNOWN",
        },
    }


def get_path(root: dict, path: str):
    cur = root
    for key in path.split("."):
        cur = cur[key]
    return cur


def set_path(root: dict, path: str, value):
    keys = path.split(".")
    cur = root
    for key in keys[:-1]:
        cur = cur.setdefault(key, {})
    cur[keys[-1]] = value


def owner_allows(owner: str, path: str) -> bool:
    allowed = OWNER_PREFIXES.get(owner, ())
    return any(path == prefix or (prefix.endswith(".") and path.startswith(prefix)) for prefix in allowed)


@dataclass(frozen=True)
class StateEvent:
    owner: str
    path: str
    value: object
    reason: str = ""


class SessionStateBackbone:
    def __init__(self, initial_state: dict | None = None):
        self._lock = threading.RLock()
        self.state = deepcopy(initial_state or default_state())
        self.events: list[dict] = []
        self.validate_invariants()

    def snapshot(self) -> dict:
        with self._lock:
            return deepcopy(self.state)

    def publish(self, event: StateEvent) -> dict:
        with self._lock:
            if event.path in PROTECTED_PATHS:
                raise PermissionError(f"Protected invariant cannot be changed: {event.path}")
            if not owner_allows(event.owner, event.path):
                raise PermissionError(f"{event.owner} does not own {event.path}")

            before = None
            try:
                before = deepcopy(get_path(self.state, event.path))
            except KeyError:
                pass

            set_path(self.state, event.path, deepcopy(event.value))
            self.state["session"]["state_version"] += 1
            self.state["session"]["updated_at"] = now_iso()
            self.validate_invariants()

            record = {
                "event_id": str(uuid.uuid4()),
                "timestamp": now_iso(),
                "owner": event.owner,
                "path": event.path,
                "before": before,
                "after": deepcopy(event.value),
                "reason": event.reason,
                "state_version": self.state["session"]["state_version"],
            }
            self.events.append(record)
            return deepcopy(record)

    def reconnect(self, browser_health: str = "ONLINE") -> dict:
        with self._lock:
            self.publish(StateEvent("browser", "session.connection_epoch", self.state["session"]["connection_epoch"] + 1, "browser reconnect"))
            self.publish(StateEvent("browser", "health.browser", browser_health, "browser reconnect"))
            return self.restore_safe_state()

    def restore_safe_state(self) -> dict:
        """Resolve unstable state without replaying side effects."""
        with self._lock:
            if self.state["physical"]["posture"] == "TRANSITION":
                stable = self.state["physical"].get("stable_anchor") or "ISABEL_DESK_STAND"
                posture = "SEATED" if stable == "ISABEL_DESK_SEATED" else "STANDING"
                self.state["physical"]["posture"] = posture
                self.state["physical"]["target_anchor"] = None
                self.state["physical"]["transition_id"] = None
                self.state["physical"]["transition_started_at"] = None

            self.state["conversation"]["isabel_speaking"] = False
            if self.state["conversation"]["response_status"] == "STREAMING":
                self.state["conversation"]["response_status"] = "INTERRUPTED"
            self.state["execution"]["in_flight_action"] = None
            self.state["execution"]["replay_allowed"] = False
            self.state["session"]["mode"] = "RECOVERING"
            self.state["session"]["state_version"] += 1
            self.state["session"]["updated_at"] = now_iso()
            self.validate_invariants()
            self.persist()
            return self.snapshot()

    def create_pending_approval(self, action_type: str, payload: dict, owner: str) -> dict:
        with self._lock:
            approval = {
                "approval_id": str(uuid.uuid4()),
                "action_type": action_type,
                "payload": deepcopy(payload),
                "payload_hash": payload_hash(payload),
                "decision_owner": owner,
                "status": "PENDING",
                "created_at": now_iso(),
            }
            pending = deepcopy(self.state["approvals"]["pending"])
            pending.append(approval)
            self.publish(StateEvent("orchestrator", "approvals.pending", pending, "approval requested"))
            return deepcopy(approval)

    def approve_exact(self, approval_id: str, payload: dict) -> dict:
        with self._lock:
            pending = deepcopy(self.state["approvals"]["pending"])
            idx = next((i for i, a in enumerate(pending) if a["approval_id"] == approval_id), None)
            if idx is None:
                raise KeyError(f"Unknown approval: {approval_id}")
            approval = pending[idx]
            if approval["payload_hash"] != payload_hash(payload):
                raise ValueError("Approval payload changed; new approval required")
            approval["status"] = "APPROVED"
            approval["approved_at"] = now_iso()
            pending.pop(idx)
            approved = deepcopy(self.state["approvals"]["approved"])
            approved.append(approval)
            self.publish(StateEvent("orchestrator", "approvals.pending", pending, "approval consumed"))
            self.publish(StateEvent("orchestrator", "approvals.approved", approved, "exact payload approved"))
            return deepcopy(approval)

    def validate_invariants(self):
        s = self.state
        assert s["identity"]["character_id"] == "ISABEL_CHARACTER"
        assert s["identity"]["identity_lock"] is True
        assert s["identity"]["face_lock"] is True
        assert s["identity"]["hair_lock"] is True
        assert s["identity"]["proportion_lock"] is True
        assert s["physical"]["active_camera"] == "CAMERA_ARRIVAL"
        assert s["execution"]["replay_allowed"] is False
        assert set(s["screens"]) == {"SCREEN_01", "SCREEN_02", "SCREEN_03", "SCREEN_04"}
        if s["execution"]["last_verified_result"] is not None:
            assert s["execution"]["last_action_result"] is not None

    def persist(self, path: Path = STATE_PATH):
        with self._lock:
            path.write_text(json.dumps(self.state, indent=2), encoding="utf-8")


if __name__ == "__main__":
    backbone = SessionStateBackbone()
    backbone.publish(StateEvent("orchestrator", "session.mode", "READY", "boot complete"))
    backbone.publish(StateEvent("unreal", "health.unreal", "ONLINE", "Unreal connected"))
    backbone.publish(StateEvent("screen_runtime", "screens.SCREEN_02.status", "LIVE", "schedule screen ready"))
    approval = backbone.create_pending_approval("SEND_MESSAGE", {"recipient": "owner@example.com", "subject": "Schedule check", "body": "Draft only"}, "USER")
    backbone.approve_exact(approval["approval_id"], approval["payload"])
    backbone.persist()
    print(json.dumps({
        "status": "PASS",
        "session_id": backbone.state["session"]["session_id"],
        "state_version": backbone.state["session"]["state_version"],
        "pending_approvals": len(backbone.state["approvals"]["pending"]),
        "approved": len(backbone.state["approvals"]["approved"]),
        "state_path": str(STATE_PATH),
    }, indent=2))
