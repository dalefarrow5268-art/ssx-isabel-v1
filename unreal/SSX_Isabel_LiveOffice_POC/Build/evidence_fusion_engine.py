"""Isabel multi-source evidence fusion engine (POC scaffold).

This module normalizes heterogeneous project evidence, groups related claims into
situation threads, preserves provenance, surfaces contradictions, and produces a
compact evidence packet for downstream decision intelligence.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
import json


HIGH_CONFIDENCE = 0.85
MEDIUM_CONFIDENCE = 0.65


@dataclass
class EvidenceRecord:
    evidence_id: str
    project_id: str
    source_type: str
    observed_at: str
    ingested_at: str
    claim: str
    provenance: Dict[str, Any]
    confidence: float
    entities: Dict[str, Any] = field(default_factory=dict)
    freshness: str = "current"
    authority: str = "derived"
    supersedes: List[str] = field(default_factory=list)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    polarity_key: Optional[str] = None
    polarity_value: Optional[str] = None


@dataclass
class Contradiction:
    key: str
    evidence_ids: List[str]
    values: List[str]
    status: str = "unresolved"


@dataclass
class SituationThread:
    thread_id: str
    project_id: str
    topic: str
    confirmed_facts: List[Dict[str, Any]] = field(default_factory=list)
    derived_implications: List[Dict[str, Any]] = field(default_factory=list)
    contradictions: List[Contradiction] = field(default_factory=list)
    unknowns: List[str] = field(default_factory=list)
    decision_points: List[str] = field(default_factory=list)
    supporting_evidence_ids: List[str] = field(default_factory=list)
    updated_at: str = ""


class EvidenceFusionEngine:
    """Deterministic fusion layer; downstream AI may explain but not rewrite facts."""

    def normalize(self, raw: Dict[str, Any]) -> EvidenceRecord:
        required = [
            "evidence_id",
            "project_id",
            "source_type",
            "observed_at",
            "claim",
            "provenance",
        ]
        missing = [key for key in required if not raw.get(key)]
        if missing:
            raise ValueError(f"Missing evidence fields: {', '.join(missing)}")

        confidence = float(raw.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))

        return EvidenceRecord(
            evidence_id=str(raw["evidence_id"]),
            project_id=str(raw["project_id"]),
            source_type=str(raw["source_type"]),
            observed_at=str(raw["observed_at"]),
            ingested_at=str(raw.get("ingested_at") or self._now()),
            claim=str(raw["claim"]),
            provenance=dict(raw["provenance"]),
            confidence=confidence,
            entities=dict(raw.get("entities") or {}),
            freshness=str(raw.get("freshness", "current")),
            authority=str(raw.get("authority", "derived")),
            supersedes=list(raw.get("supersedes") or []),
            attachments=list(raw.get("attachments") or []),
            polarity_key=raw.get("polarity_key"),
            polarity_value=raw.get("polarity_value"),
        )

    def fuse(
        self,
        thread_id: str,
        project_id: str,
        topic: str,
        records: Iterable[EvidenceRecord],
        unknowns: Optional[List[str]] = None,
        decision_points: Optional[List[str]] = None,
    ) -> SituationThread:
        records = [r for r in records if r.project_id == project_id]
        thread = SituationThread(
            thread_id=thread_id,
            project_id=project_id,
            topic=topic,
            unknowns=list(unknowns or []),
            decision_points=list(decision_points or []),
            updated_at=self._now(),
        )

        superseded_ids = {sid for r in records for sid in r.supersedes}
        active_records = [r for r in records if r.evidence_id not in superseded_ids]
        thread.supporting_evidence_ids = [r.evidence_id for r in active_records]

        for record in active_records:
            fact = {
                "claim": record.claim,
                "evidence_id": record.evidence_id,
                "confidence": record.confidence,
                "authority": record.authority,
                "freshness": record.freshness,
                "provenance": record.provenance,
            }
            if record.confidence >= MEDIUM_CONFIDENCE and record.freshness != "stale":
                thread.confirmed_facts.append(fact)
            else:
                thread.derived_implications.append({
                    **fact,
                    "classification": "unverified_or_weak_support",
                })

        thread.contradictions = self._find_contradictions(active_records)
        if thread.contradictions:
            # Contradictions lower certainty. Never silently collapse them.
            for contradiction in thread.contradictions:
                thread.unknowns.append(
                    f"Resolve conflicting evidence for {contradiction.key}: "
                    + " vs ".join(contradiction.values)
                )

        return thread

    def add_derived_implication(
        self,
        thread: SituationThread,
        implication: str,
        supporting_records: Iterable[EvidenceRecord],
    ) -> None:
        records = list(supporting_records)
        independent_sources = {(r.source_type, json.dumps(r.provenance, sort_keys=True)) for r in records}
        base_confidence = min((r.confidence for r in records), default=0.0)
        if len(independent_sources) < 2:
            base_confidence = min(base_confidence, 0.84)

        contradictory_ids = {
            evidence_id
            for contradiction in thread.contradictions
            for evidence_id in contradiction.evidence_ids
        }
        if any(r.evidence_id in contradictory_ids for r in records):
            base_confidence = min(base_confidence, 0.64)

        thread.derived_implications.append({
            "claim": implication,
            "supporting_evidence_ids": [r.evidence_id for r in records],
            "confidence": round(base_confidence, 3),
            "language": self.confidence_language(base_confidence),
        })

    def smallest_missing_fact(self, thread: SituationThread) -> Optional[str]:
        if not thread.unknowns:
            return None
        # For the POC, preserve explicit ordering: the first unknown should be the
        # highest-value unresolved fact supplied by the decision planner.
        return thread.unknowns[0]

    @staticmethod
    def confidence_language(confidence: float) -> str:
        if confidence >= HIGH_CONFIDENCE:
            return "confirmed_or_strongly_supported"
        if confidence >= MEDIUM_CONFIDENCE:
            return "likely_evidence_indicates"
        return "possible_not_yet_verified"

    @staticmethod
    def _find_contradictions(records: List[EvidenceRecord]) -> List[Contradiction]:
        buckets: Dict[str, Dict[str, List[str]]] = {}
        for record in records:
            if not record.polarity_key or record.polarity_value is None:
                continue
            buckets.setdefault(record.polarity_key, {}).setdefault(
                str(record.polarity_value), []
            ).append(record.evidence_id)

        contradictions: List[Contradiction] = []
        for key, values in buckets.items():
            if len(values) <= 1:
                continue
            evidence_ids = [eid for ids in values.values() for eid in ids]
            contradictions.append(
                Contradiction(
                    key=key,
                    evidence_ids=evidence_ids,
                    values=list(values.keys()),
                )
            )
        return contradictions

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()


def storefront_acceptance_demo() -> Dict[str, Any]:
    engine = EvidenceFusionEngine()
    raw = [
        {
            "evidence_id": "RFI-117",
            "project_id": "DEMO",
            "source_type": "rfi",
            "observed_at": "2026-08-06T13:00:00Z",
            "claim": "RFI-117 revises the Level 2 storefront anchorage detail.",
            "provenance": {"document": "RFI-117", "section": "response"},
            "confidence": 0.98,
            "authority": "official",
        },
        {
            "evidence_id": "SCHED-44",
            "project_id": "DEMO",
            "source_type": "schedule",
            "observed_at": "2026-08-06T12:00:00Z",
            "claim": "Level 2 storefront installation is scheduled to begin in 18 calendar days.",
            "provenance": {"update": "44", "activity_id": "STOREFRONT-L2"},
            "confidence": 0.96,
            "authority": "official",
        },
        {
            "evidence_id": "SUB-203",
            "project_id": "DEMO",
            "source_type": "submittal",
            "observed_at": "2026-08-06T11:15:00Z",
            "claim": "Fabrication release status is not yet verified after the RFI response.",
            "provenance": {"submittal": "203", "field": "fabrication_release"},
            "confidence": 0.72,
            "authority": "participant_report",
            "polarity_key": "fabrication_release",
            "polarity_value": "unverified",
        },
        {
            "evidence_id": "MIN-21",
            "project_id": "DEMO",
            "source_type": "meeting_minutes",
            "observed_at": "2026-08-05T18:00:00Z",
            "claim": "Owner-facing schedule-impact communication requires written confirmation first.",
            "provenance": {"meeting": "Owner Coordination", "item": "21"},
            "confidence": 0.93,
            "authority": "official",
        },
    ]
    records = [engine.normalize(item) for item in raw]
    thread = engine.fuse(
        "THREAD-STOREFRONT-L2",
        "DEMO",
        "Level 2 storefront anchorage",
        records,
        unknowns=["Has fabrication actually been released against the revised detail?"],
        decision_points=["Whether schedule exposure requires escalation or mitigation now."],
    )
    engine.add_derived_implication(
        thread,
        "The revised anchorage detail creates schedule exposure because installation is near, but a delay is not confirmed until fabrication release status is verified.",
        records[:3],
    )
    return asdict(thread)


if __name__ == "__main__":
    print(json.dumps(storefront_acceptance_demo(), indent=2))
