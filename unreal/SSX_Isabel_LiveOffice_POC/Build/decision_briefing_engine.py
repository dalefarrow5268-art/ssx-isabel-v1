from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, Iterable, List, Optional


CONFIDENCE_LANGUAGE = [
    (0.90, "strongly supported by the current evidence"),
    (0.70, "likely based on the current evidence"),
    (0.40, "possible, but still needs confirmation"),
    (0.00, "not supported strongly enough to call yet"),
]


@dataclass
class BriefingOption:
    label: str
    schedule_exposure: str = "unknown"
    cost_exposure: str = "unknown"
    reversibility: str = "unknown"
    confidence: float = 0.0
    note: str = ""


@dataclass
class DecisionBriefing:
    headline: str
    confirmed: List[str]
    likely_effect: str
    confidence: float
    unknowns: List[str]
    options: List[BriefingOption]
    recommendation: Optional[str]
    decision_owner: str
    next_evidence: List[str]
    sources: List[str]
    spoken_summary: str
    screen_target: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["confidence_language"] = confidence_phrase(self.confidence)
        return payload


def confidence_phrase(confidence: float) -> str:
    c = max(0.0, min(1.0, float(confidence)))
    for threshold, phrase in CONFIDENCE_LANGUAGE:
        if c >= threshold:
            return phrase
    return CONFIDENCE_LANGUAGE[-1][1]


def choose_screen(topic: str) -> Optional[str]:
    topic = (topic or "").lower()
    if any(k in topic for k in ("schedule", "milestone", "delay", "lookahead")):
        return "SCREEN_02"
    if any(k in topic for k in ("risk", "issue", "exposure", "decision")):
        return "SCREEN_03"
    if any(k in topic for k in ("evidence", "rfi", "submittal", "photo", "drawing", "email")):
        return "SCREEN_04"
    if topic:
        return "SCREEN_01"
    return None


def _clean(items: Iterable[str]) -> List[str]:
    return [str(x).strip() for x in items if str(x).strip()]


def build_spoken_summary(
    headline: str,
    likely_effect: str,
    confidence: float,
    unknowns: List[str],
    recommendation: Optional[str],
    decision_owner: str,
) -> str:
    parts = [headline.rstrip(". ") + "."]
    if likely_effect:
        parts.append(f"The likely effect is {likely_effect.rstrip('. ')}; that is {confidence_phrase(confidence)}.")
    if unknowns:
        parts.append(f"What I still need is {unknowns[0].rstrip('. ')}.")
    if recommendation:
        parts.append(f"My recommended next move is {recommendation.rstrip('. ')}.")
    if decision_owner:
        parts.append(f"The decision belongs to {decision_owner.rstrip('. ')}.")
    return " ".join(parts)


def make_briefing(
    *,
    topic: str,
    headline: str,
    confirmed: Iterable[str],
    likely_effect: str,
    confidence: float,
    unknowns: Iterable[str],
    options: Iterable[Dict[str, Any]],
    recommendation: Optional[str],
    decision_owner: str,
    next_evidence: Iterable[str],
    sources: Iterable[str],
) -> DecisionBriefing:
    confidence = max(0.0, min(1.0, float(confidence)))
    confirmed_list = _clean(confirmed)
    unknown_list = _clean(unknowns)
    evidence_list = _clean(next_evidence)
    source_list = _clean(sources)
    option_models = [BriefingOption(**item) for item in options]

    if confidence < 0.40:
        recommendation = recommendation or "gather the missing evidence before taking a consequential action"
    if not source_list:
        confidence = min(confidence, 0.39)

    spoken = build_spoken_summary(
        headline=headline,
        likely_effect=likely_effect,
        confidence=confidence,
        unknowns=unknown_list,
        recommendation=recommendation,
        decision_owner=decision_owner,
    )

    return DecisionBriefing(
        headline=headline.strip(),
        confirmed=confirmed_list,
        likely_effect=likely_effect.strip(),
        confidence=confidence,
        unknowns=unknown_list,
        options=option_models,
        recommendation=recommendation.strip() if recommendation else None,
        decision_owner=decision_owner.strip(),
        next_evidence=evidence_list,
        sources=source_list,
        spoken_summary=spoken,
        screen_target=choose_screen(topic),
    )


def storefront_example() -> Dict[str, Any]:
    briefing = make_briefing(
        topic="schedule rfi evidence",
        headline="RFI-117 changes the storefront anchorage detail and creates schedule exposure because installation starts in 18 days",
        confirmed=[
            "RFI-117 changes the Level 2 storefront anchorage detail",
            "Storefront installation is scheduled to begin in 18 calendar days",
            "The owner requested written backup before schedule-impacting coordination",
        ],
        likely_effect="fabrication release could be affected, which could put the installation date at risk",
        confidence=0.74,
        unknowns=[
            "whether the revised detail changes fabrication release status",
            "whether material already released can proceed without rework",
        ],
        options=[
            {
                "label": "Verify fabrication release before changing sequence",
                "schedule_exposure": "low",
                "cost_exposure": "low",
                "reversibility": "high",
                "confidence": 0.90,
                "note": "Preserves optionality while closing the most important evidence gap.",
            },
            {
                "label": "Hold fabrication immediately",
                "schedule_exposure": "medium",
                "cost_exposure": "medium",
                "reversibility": "medium",
                "confidence": 0.50,
                "note": "May protect against rework but could create avoidable delay if the revision does not affect fabrication.",
            },
        ],
        recommendation="confirm fabrication-release impact today before changing the sequence or issuing an owner-facing delay statement",
        decision_owner="the project manager, with superintendent and fabrication input",
        next_evidence=[
            "fabricator confirmation of release status",
            "field confirmation of alternate sequence options",
        ],
        sources=["RFI-117", "SCHEDULE-UPDATE-44", "OWNER-MINUTES-21"],
    )
    return briefing.to_dict()


if __name__ == "__main__":
    import json
    print(json.dumps(storefront_example(), indent=2))
