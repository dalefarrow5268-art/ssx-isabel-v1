"""Decision-intelligence layer for Isabel.

This module is deliberately provider-agnostic. It takes verified project signals and
produces a structured decision brief that downstream speech, screen, and behavior
systems can use. It never executes consequential actions itself.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Iterable, List, Optional


@dataclass
class EvidenceItem:
    ref: str
    statement: str
    confidence: float = 1.0
    source: Optional[str] = None


@dataclass
class DecisionSignal:
    event_type: str
    summary: str
    evidence: List[EvidenceItem] = field(default_factory=list)
    candidate_impacts: List[str] = field(default_factory=list)
    unknowns: List[str] = field(default_factory=list)
    decision_required: Optional[str] = None
    decision_owner: Optional[str] = None
    recommended_next_step: Optional[str] = None
    authority_required: bool = True


@dataclass
class DecisionBrief:
    what_changed: str
    why_it_matters: List[str]
    confirmed_facts: List[str]
    unknowns: List[str]
    evidence_refs: List[str]
    confidence: float
    confidence_band: str
    decision_required: Optional[str]
    decision_owner: Optional[str]
    recommended_next_step: Optional[str]
    authority_required: bool
    can_execute: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def confidence_band(score: float) -> str:
    if score >= 0.82:
        return "HIGH"
    if score >= 0.58:
        return "MEDIUM"
    return "LOW"


def evidence_confidence(items: Iterable[EvidenceItem]) -> float:
    items = list(items)
    if not items:
        return 0.0
    weighted = sum(_clamp(item.confidence) for item in items) / len(items)
    # Cap inference confidence below 1.0 even with perfect sources.
    return round(min(weighted, 0.97), 3)


def build_decision_brief(signal: DecisionSignal) -> DecisionBrief:
    score = evidence_confidence(signal.evidence)
    band = confidence_band(score)

    confirmed = [item.statement for item in signal.evidence if item.confidence >= 0.82]
    refs = [item.ref for item in signal.evidence]

    impacts = list(signal.candidate_impacts)
    unknowns = list(signal.unknowns)
    recommendation = signal.recommended_next_step

    # Low-confidence situations may be described, but not turned into consequential advice.
    if band == "LOW":
        recommendation = "Retrieve or confirm more evidence before recommending a consequential action."

    return DecisionBrief(
        what_changed=signal.summary,
        why_it_matters=impacts,
        confirmed_facts=confirmed,
        unknowns=unknowns,
        evidence_refs=refs,
        confidence=score,
        confidence_band=band,
        decision_required=signal.decision_required,
        decision_owner=signal.decision_owner,
        recommended_next_step=recommendation,
        authority_required=signal.authority_required,
        can_execute=False,
    )


def speech_outline(brief: DecisionBrief) -> List[str]:
    """Return the preferred spoken sequence without fabricating missing content."""
    lines: List[str] = [f"What changed: {brief.what_changed}"]

    if brief.why_it_matters:
        lines.append("Why it matters: " + "; ".join(brief.why_it_matters))
    if brief.confirmed_facts:
        lines.append("Confirmed: " + "; ".join(brief.confirmed_facts))
    if brief.unknowns:
        lines.append("Still unknown: " + "; ".join(brief.unknowns))
    if brief.decision_required:
        lines.append("Decision needed: " + brief.decision_required)
    if brief.recommended_next_step:
        lines.append("Recommended next step: " + brief.recommended_next_step)

    return lines


def demo_storefront_case() -> Dict[str, Any]:
    signal = DecisionSignal(
        event_type="rfi_update",
        summary="RFI-117 changed the Level 2 storefront anchorage detail with installation 18 days away.",
        evidence=[
            EvidenceItem("RFI-117", "The RFI response changed the Level 2 storefront anchorage detail.", 0.99, "RFI"),
            EvidenceItem("SCHEDULE-44", "Storefront installation begins in 18 calendar days.", 0.98, "Schedule"),
        ],
        candidate_impacts=[
            "fabrication release could be affected",
            "the installation milestone could become exposed if revised material or engineering is required",
        ],
        unknowns=[
            "whether fabrication has already been released",
            "whether the revised detail changes procurement or engineering lead time",
            "whether field sequencing can absorb the change",
        ],
        decision_required="Decide whether to hold release, resequence work, or proceed after confirmation.",
        decision_owner="authorized project leadership",
        recommended_next_step="Confirm fabrication status and revised-detail lead-time impact before making a schedule commitment.",
        authority_required=True,
    )
    brief = build_decision_brief(signal)
    return {"brief": brief.to_dict(), "speech": speech_outline(brief)}


if __name__ == "__main__":
    import json

    print(json.dumps(demo_storefront_case(), indent=2))
