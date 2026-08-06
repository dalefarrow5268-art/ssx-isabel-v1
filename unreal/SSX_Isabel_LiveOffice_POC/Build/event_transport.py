from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Set
import uuid


@dataclass(frozen=True)
class EventEnvelope:
    session_id: str
    connection_epoch: int
    sequence: int
    source: str
    type: str
    payload: Dict[str, Any]
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    issued_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    request_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    state_version: Optional[int] = None
    priority: str = "normal"


class EventRejected(RuntimeError):
    pass


class IsabelEventBus:
    """In-process POC event bus with ordering, replay log and idempotency.

    Saturday this adapter can sit behind WebSocket/WebRTC data-channel transport. The
    contract stays the same even if the underlying transport changes.
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.connection_epoch = 0
        self._sequence = 0
        self._subscribers: Dict[str, List[Callable[[EventEnvelope], None]]] = {}
        self._wildcard: List[Callable[[EventEnvelope], None]] = []
        self._seen_idempotency: Set[str] = set()
        self._log: List[EventEnvelope] = []
        self._latest_sequence_by_source: Dict[str, int] = {}

    def begin_connection_epoch(self) -> int:
        self.connection_epoch += 1
        return self.connection_epoch

    def subscribe(self, event_type: str, callback: Callable[[EventEnvelope], None]) -> None:
        if event_type == "*":
            self._wildcard.append(callback)
            return
        self._subscribers.setdefault(event_type, []).append(callback)

    def publish(
        self,
        source: str,
        event_type: str,
        payload: Dict[str, Any],
        *,
        idempotency_key: Optional[str] = None,
        correlation_id: Optional[str] = None,
        causation_id: Optional[str] = None,
        request_id: Optional[str] = None,
        state_version: Optional[int] = None,
        priority: str = "normal",
        connection_epoch: Optional[int] = None,
    ) -> EventEnvelope:
        epoch = self.connection_epoch if connection_epoch is None else connection_epoch
        if epoch < self.connection_epoch:
            raise EventRejected(
                f"stale connection epoch {epoch}; current epoch is {self.connection_epoch}"
            )

        if idempotency_key and idempotency_key in self._seen_idempotency:
            # Return the original event when possible; duplicate is not re-applied.
            for existing in reversed(self._log):
                if existing.idempotency_key == idempotency_key:
                    return existing
            raise EventRejected("duplicate idempotency key")

        self._sequence += 1
        event = EventEnvelope(
            session_id=self.session_id,
            connection_epoch=epoch,
            sequence=self._sequence,
            source=source,
            type=event_type,
            payload=payload,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            causation_id=causation_id,
            request_id=request_id,
            state_version=state_version,
            priority=priority,
        )

        last = self._latest_sequence_by_source.get(source, 0)
        if event.sequence <= last:
            raise EventRejected("out-of-order source sequence")

        self._latest_sequence_by_source[source] = event.sequence
        if idempotency_key:
            self._seen_idempotency.add(idempotency_key)
        self._log.append(event)

        for callback in self._subscribers.get(event_type, []):
            callback(event)
        for callback in self._wildcard:
            callback(event)
        return event

    def replay(self, after_sequence: int = 0) -> List[EventEnvelope]:
        return [event for event in self._log if event.sequence > after_sequence]

    @property
    def latest_sequence(self) -> int:
        return self._sequence


class CommandFence:
    """Prevents stale async completions from mutating newer intent.

    Example: LOOK_AT_USER starts, then GO_TO_SCREEN_02 supersedes it. When the old
    gaze animation completes, its token no longer matches and the completion is ignored.
    """

    def __init__(self):
        self._generation: Dict[str, int] = {}

    def issue(self, channel: str) -> int:
        value = self._generation.get(channel, 0) + 1
        self._generation[channel] = value
        return value

    def is_current(self, channel: str, token: int) -> bool:
        return self._generation.get(channel, 0) == token


class ApprovalFence:
    def __init__(self):
        self._approved_hashes: Dict[str, str] = {}

    def approve(self, action_id: str, payload_hash: str) -> None:
        self._approved_hashes[action_id] = payload_hash

    def revoke(self, action_id: str) -> None:
        self._approved_hashes.pop(action_id, None)

    def is_approved(self, action_id: str, payload_hash: str) -> bool:
        return self._approved_hashes.get(action_id) == payload_hash


if __name__ == "__main__":
    bus = IsabelEventBus("demo-session")
    epoch = bus.begin_connection_epoch()
    seen: List[str] = []
    bus.subscribe("*", lambda event: seen.append(f"{event.sequence}:{event.type}"))

    a = bus.publish("browser", "user.arrived", {"present": True}, connection_epoch=epoch)
    bus.publish(
        "execution",
        "execution.requested",
        {"action_id": "send-owner-draft"},
        idempotency_key="exec-send-owner-draft-v1",
        correlation_id=a.event_id,
    )
    # Duplicate request is acknowledged but not dispatched twice.
    bus.publish(
        "execution",
        "execution.requested",
        {"action_id": "send-owner-draft"},
        idempotency_key="exec-send-owner-draft-v1",
        correlation_id=a.event_id,
    )

    assert seen == ["1:user.arrived", "2:execution.requested"]

    fence = CommandFence()
    old = fence.issue("movement")
    new = fence.issue("movement")
    assert not fence.is_current("movement", old)
    assert fence.is_current("movement", new)

    approvals = ApprovalFence()
    approvals.approve("send-owner-draft", "hash-v1")
    assert approvals.is_approved("send-owner-draft", "hash-v1")
    assert not approvals.is_approved("send-owner-draft", "hash-v2")

    print("PASS: cross-system event transport contract")
