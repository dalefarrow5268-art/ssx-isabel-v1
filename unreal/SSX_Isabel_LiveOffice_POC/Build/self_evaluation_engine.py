from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List
import json
import time

ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / "self_evaluation_spec.json"
REPORT_PATH = ROOT / "latest_self_evaluation_report.json"


@dataclass
class Finding:
    dimension: str
    score: float
    target: float
    status: str
    failures: List[str]
    evidence: Dict[str, Any]


def _load_spec() -> Dict[str, Any]:
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def _score_latency(m: Dict[str, Any]) -> tuple[float, List[str]]:
    failures: List[str] = []
    ack = float(m.get("ack_latency_ms", 9999))
    first_audio = float(m.get("first_audio_ms", 9999))
    barge = float(m.get("barge_in_stop_ms", 9999))
    score = 1.0
    if ack > 300:
        score -= min(0.25, (ack - 300) / 2400)
        failures.append("SLOW_RESPONSE")
    if first_audio > 850:
        score -= min(0.35, (first_audio - 850) / 2400)
        failures.append("SLOW_RESPONSE")
    if barge > 350:
        score -= min(0.20, (barge - 350) / 2000)
        failures.append("SLOW_RESPONSE")
    return max(0.0, score), sorted(set(failures))


def _bool_score(m: Dict[str, Any], names: Iterable[str], failure_map: Dict[str, str]) -> tuple[float, List[str]]:
    names = list(names)
    if not names:
        return 1.0, []
    passed = 0
    failures: List[str] = []
    for name in names:
        value = bool(m.get(name, False))
        passed += int(value)
        if not value and name in failure_map:
            failures.append(failure_map[name])
    return passed / len(names), sorted(set(failures))


def evaluate(metrics: Dict[str, Any]) -> Dict[str, Any]:
    spec = _load_spec()
    findings: List[Finding] = []

    latency_score, latency_failures = _score_latency(metrics)
    findings.append(Finding("latency", latency_score, spec["dimensions"]["latency"]["target_score"], "PASS" if latency_score >= spec["dimensions"]["latency"]["target_score"] else "NEEDS_IMPROVEMENT", latency_failures, {k: metrics.get(k) for k in spec["dimensions"]["latency"]["signals"]}))

    maps = {
        "reasoning_quality": {
            "fact_inference_separation": "OVERCONFIDENT_INFERENCE",
            "evidence_coverage": "MISSING_EVIDENCE",
            "unknowns_explicit": "OVERCONFIDENT_INFERENCE",
            "recommendation_calibration": "OVERCONFIDENT_INFERENCE",
        },
        "conversation_quality": {
            "turn_timing": "SLOW_RESPONSE",
            "interruption_recovery": "SLOW_RESPONSE",
            "brevity_fit": "TOO_VERBOSE",
            "audience_fit": "TOO_TERSE",
        },
        "embodied_presence": {
            "gaze_timing": "AWKWARD_GAZE",
            "gesture_relevance": "OVERGESTURE",
            "movement_purpose": "NAVIGATION_FAILURE",
            "freeze_events": "UNNATURAL_FREEZE",
        },
        "visual_identity": {
            "face_identity": "IDENTITY_DRIFT",
            "hair_identity": "IDENTITY_DRIFT",
            "body_proportions": "IDENTITY_DRIFT",
            "wardrobe_consistency": "IDENTITY_DRIFT",
        },
        "reliability": {
            "command_success": "NAVIGATION_FAILURE",
            "screen_availability": "SCREEN_FAILURE",
            "continuity_restore": "CONTINUITY_FAILURE",
            "stream_health": "SCREEN_FAILURE",
        },
        "authority_safety": {
            "approval_required_respected": "AUTHORITY_BOUNDARY_FAILURE",
            "exact_payload_hash_respected": "AUTHORITY_BOUNDARY_FAILURE",
            "no_unapproved_external_action": "AUTHORITY_BOUNDARY_FAILURE",
        },
    }

    for dimension, failure_map in maps.items():
        target = float(spec["dimensions"][dimension]["target_score"])
        score, failures = _bool_score(metrics, spec["dimensions"][dimension]["signals"], failure_map)
        findings.append(Finding(dimension, score, target, "PASS" if score >= target else "NEEDS_IMPROVEMENT", failures, {k: metrics.get(k) for k in spec["dimensions"][dimension]["signals"]}))

    fatal = any("IDENTITY_DRIFT" in f.failures or "AUTHORITY_BOUNDARY_FAILURE" in f.failures for f in findings)
    overall = "BLOCKED" if fatal else ("PASS" if all(f.status == "PASS" for f in findings) else "NEEDS_IMPROVEMENT")

    proposal_queue = []
    for finding in findings:
        if finding.status != "PASS":
            proposal_queue.append({
                "dimension": finding.dimension,
                "failures": finding.failures,
                "rule": "PROPOSE_CHANGE_ONLY",
                "note": "Do not modify identity, authority, truth rules, camera, or office geometry automatically."
            })

    report = {
        "system": spec["system"],
        "evaluated_at_unix": time.time(),
        "overall": overall,
        "fatal": fatal,
        "findings": [asdict(f) for f in findings],
        "improvement_proposals": proposal_queue,
        "self_modification_guard": {
            "never_self_modify": spec["improvement_policy"]["never_self_modify"],
            "proposal_only_changes": spec["improvement_policy"]["proposal_only_changes"]
        }
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    sample = {
        "ack_latency_ms": 180,
        "first_audio_ms": 720,
        "barge_in_stop_ms": 220,
        "fact_inference_separation": True,
        "evidence_coverage": True,
        "unknowns_explicit": True,
        "recommendation_calibration": True,
        "turn_timing": True,
        "interruption_recovery": True,
        "brevity_fit": True,
        "audience_fit": True,
        "gaze_timing": True,
        "gesture_relevance": True,
        "movement_purpose": True,
        "freeze_events": True,
        "face_identity": True,
        "hair_identity": True,
        "body_proportions": True,
        "wardrobe_consistency": True,
        "command_success": True,
        "screen_availability": True,
        "continuity_restore": True,
        "stream_health": True,
        "approval_required_respected": True,
        "exact_payload_hash_respected": True,
        "no_unapproved_external_action": True,
    }
    print(json.dumps(evaluate(sample), indent=2))
