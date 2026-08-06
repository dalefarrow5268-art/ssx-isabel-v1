from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Any


@dataclass
class Scenario:
    name: str
    assumptions: List[str]
    impacts: Dict[str, float]
    confidence: float
    evidence_ids: List[str]
    unknowns: List[str]
    reversible: bool
    recommended_next_step: str
    decision_owner: str


DEFAULT_WEIGHTS = {
    "schedule": 1.0,
    "cost_exposure": 0.9,
    "coordination_risk": 0.8,
    "safety_risk": 1.0,
    "quality_risk": 0.9,
    "procurement_risk": 0.85,
    "owner_impact": 0.7,
    "reversibility": 0.65,
}


def _risk_score(scenario: Scenario, weights: Dict[str, float]) -> float:
    score = 0.0
    for key, weight in weights.items():
        if key == "reversibility":
            value = 0.0 if scenario.reversible else 1.0
        else:
            value = float(scenario.impacts.get(key, 0.0))
        score += value * weight
    confidence_penalty = max(0.0, 1.0 - scenario.confidence) * 2.0
    unknown_penalty = min(len(scenario.unknowns) * 0.25, 1.5)
    return round(score + confidence_penalty + unknown_penalty, 3)


def compare_scenarios(baseline: Dict[str, Any], scenarios: List[Scenario], weights: Dict[str, float] | None = None) -> Dict[str, Any]:
    weights = weights or DEFAULT_WEIGHTS
    ranked = []
    for scenario in scenarios:
        score = _risk_score(scenario, weights)
        item = asdict(scenario)
        item["risk_score"] = score
        item["status"] = "candidate" if scenario.confidence >= 0.65 else "needs_more_evidence"
        ranked.append(item)

    ranked.sort(key=lambda x: x["risk_score"])
    viable = [x for x in ranked if x["status"] == "candidate"]
    recommendation = viable[0]["name"] if viable else "GATHER_MORE_EVIDENCE"

    return {
        "baseline": baseline,
        "ranked_scenarios": ranked,
        "recommended_option": recommendation,
        "authority_note": "Recommendation only. Consequential project action requires human authorization.",
    }


def storefront_demo() -> Dict[str, Any]:
    baseline = {
        "install_start_days": 18,
        "fabrication_release": "unverified",
        "rfi_117": "revised anchorage detail",
    }

    scenarios = [
        Scenario(
            name="HOLD_FABRICATION_2_DAYS",
            assumptions=["Fabricator can absorb a 2-day hold without losing production slot."],
            impacts={
                "schedule": 0.55,
                "cost_exposure": 0.35,
                "coordination_risk": 0.2,
                "safety_risk": 0.05,
                "quality_risk": 0.15,
                "procurement_risk": 0.45,
                "owner_impact": 0.25,
            },
            confidence=0.62,
            evidence_ids=["RFI-117", "SCHEDULE-44"],
            unknowns=["Fabricator production-slot tolerance"],
            reversible=True,
            recommended_next_step="Confirm fabrication slot tolerance before choosing this option.",
            decision_owner="Project executive / authorized project manager",
        ),
        Scenario(
            name="CONTINUE_PENDING_CONFIRMATION",
            assumptions=["Current detail can continue without rework if RFI interpretation is unchanged."],
            impacts={
                "schedule": 0.15,
                "cost_exposure": 0.65,
                "coordination_risk": 0.65,
                "safety_risk": 0.1,
                "quality_risk": 0.7,
                "procurement_risk": 0.1,
                "owner_impact": 0.4,
            },
            confidence=0.48,
            evidence_ids=["RFI-117"],
            unknowns=["Engineer confirmation", "Fabrication-release status"],
            reversible=False,
            recommended_next_step="Do not recommend until engineer and fabrication status are confirmed.",
            decision_owner="Project executive / design authority",
        ),
        Scenario(
            name="RESEQUENCE_NONDEPENDENT_WORK",
            assumptions=["Crew and predecessor work are available for alternate tasks."],
            impacts={
                "schedule": 0.2,
                "cost_exposure": 0.2,
                "coordination_risk": 0.3,
                "safety_risk": 0.1,
                "quality_risk": 0.1,
                "procurement_risk": 0.1,
                "owner_impact": 0.15,
            },
            confidence=0.78,
            evidence_ids=["SCHEDULE-44", "LOOKAHEAD-14D"],
            unknowns=["Field crew availability"],
            reversible=True,
            recommended_next_step="Verify crew availability and preserve storefront float while RFI/fabrication status is confirmed.",
            decision_owner="Superintendent / project manager",
        ),
    ]

    return compare_scenarios(baseline, scenarios)


if __name__ == "__main__":
    import json
    print(json.dumps(storefront_demo(), indent=2))
