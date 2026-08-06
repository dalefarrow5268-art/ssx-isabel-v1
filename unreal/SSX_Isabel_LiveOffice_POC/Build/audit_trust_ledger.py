"""Isabel audit + trust ledger.

Append-only event ledger for evidence, reasoning outputs, approvals, execution and verification.
Designed to be wired to a durable store later; JSONL is used for the POC.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4


BUILD_DIR = Path(__file__).resolve().parent
LEDGER_PATH = BUILD_DIR / "latest_audit_ledger.jsonl"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_payload_hash(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return sha256(encoded).hexdigest()


@dataclass(frozen=True)
class AuditEvent:
    event_type: str
    project_id: str
    actor: str
    summary: str
    confidence: float = 1.0
    source_ids: list[str] = field(default_factory=list)
    correlation_id: str = field(default_factory=lambda: str(uuid4()))
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(default_factory=utc_now)
    decision_owner: str | None = None
    approval_id: str | None = None
    payload_hash: str | None = None
    parent_event_ids: list[str] = field(default_factory=list)
    supersedes_event_id: str | None = None
    result: Any = None
    verification: Any = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0 and 1")
        if self.event_type == "APPROVAL_GRANTED" and (not self.approval_id or not self.payload_hash):
            raise ValueError("approval events require approval_id and exact payload_hash")
        if self.event_type.startswith("ACTION_EXECUTION") and not self.payload_hash:
            raise ValueError("execution events require payload_hash")
        if self.event_type == "RESULT_VERIFIED" and self.verification is None:
            raise ValueError("verification event requires verification data")


class AuditLedger:
    def __init__(self, path: Path = LEDGER_PATH) -> None:
        self.path = path

    def append(self, event: AuditEvent) -> AuditEvent:
        event.validate()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(event), sort_keys=True, ensure_ascii=False) + "\n")
        return event

    def events(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        rows = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
        return rows

    def trace(self, correlation_id: str) -> list[dict[str, Any]]:
        return [row for row in self.events() if row["correlation_id"] == correlation_id]

    def approval_is_valid(self, approval_id: str, payload: Any) -> bool:
        expected_hash = canonical_payload_hash(payload)
        approvals = [
            row for row in self.events()
            if row.get("approval_id") == approval_id and row["event_type"] in {"APPROVAL_GRANTED", "APPROVAL_REVOKED"}
        ]
        if not approvals:
            return False
        latest = approvals[-1]
        return latest["event_type"] == "APPROVAL_GRANTED" and latest.get("payload_hash") == expected_hash

    def trust_summary(self, correlation_id: str) -> dict[str, list[dict[str, Any]]]:
        groups = {
            "confirmed": [],
            "inferred": [],
            "unknown": [],
            "recommended": [],
            "approved": [],
            "executed": [],
            "verified": [],
        }
        mapping = {
            "FACT_CONFIRMED": "confirmed",
            "INFERENCE_DERIVED": "inferred",
            "UNKNOWN_IDENTIFIED": "unknown",
            "RECOMMENDATION_CREATED": "recommended",
            "APPROVAL_GRANTED": "approved",
            "ACTION_EXECUTION_SUCCEEDED": "executed",
            "RESULT_VERIFIED": "verified",
        }
        for row in self.trace(correlation_id):
            bucket = mapping.get(row["event_type"])
            if bucket:
                groups[bucket].append(row)
        return groups


def demo() -> dict[str, Any]:
    ledger = AuditLedger(BUILD_DIR / "demo_audit_ledger.jsonl")
    if ledger.path.exists():
        ledger.path.unlink()

    correlation = str(uuid4())
    fact = ledger.append(AuditEvent(
        event_type="FACT_CONFIRMED",
        project_id="DEMO",
        actor="ISABEL",
        summary="Storefront installation begins in 18 days.",
        confidence=1.0,
        source_ids=["SCHEDULE-44"],
        correlation_id=correlation,
    ))
    inference = ledger.append(AuditEvent(
        event_type="INFERENCE_DERIVED",
        project_id="DEMO",
        actor="ISABEL",
        summary="Fabrication release may create schedule exposure.",
        confidence=0.72,
        source_ids=["RFI-117", "SCHEDULE-44"],
        parent_event_ids=[fact.event_id],
        correlation_id=correlation,
    ))
    payload = {"action": "request_fabrication_status", "recipient": "Maya Chen", "project": "DEMO"}
    payload_hash = canonical_payload_hash(payload)
    approval_id = str(uuid4())
    ledger.append(AuditEvent(
        event_type="APPROVAL_GRANTED",
        project_id="DEMO",
        actor="USER",
        summary="Approved exact fabrication-status request.",
        confidence=1.0,
        source_ids=[],
        correlation_id=correlation,
        approval_id=approval_id,
        payload_hash=payload_hash,
        parent_event_ids=[inference.event_id],
    ))

    assert ledger.approval_is_valid(approval_id, payload)
    assert not ledger.approval_is_valid(approval_id, {**payload, "recipient": "Different Person"})
    return ledger.trust_summary(correlation)


if __name__ == "__main__":
    print(json.dumps(demo(), indent=2))
