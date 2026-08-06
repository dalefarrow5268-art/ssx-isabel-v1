from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import hashlib
import json
import time
import uuid


SAFE_CLASSES = {"read_only", "prepare", "internal_reversible"}
CONSEQUENTIAL_CLASS = "external_consequential"


@dataclass
class Approval:
    step_id: str
    payload_hash: str
    approved_by: str
    approved_at: float = field(default_factory=time.time)


@dataclass
class StepResult:
    step_id: str
    status: str
    message: str
    verified: bool = False


class ActionPlanExecutor:
    """Policy-first action-plan runner.

    This module does not send email, alter schedules, approve submittals, or commit cost.
    It provides the control logic that future tool adapters must obey.
    """

    def __init__(self) -> None:
        self.approvals: Dict[str, Approval] = {}
        self.results: Dict[str, StepResult] = {}
        self.paused = False
        self.cancelled = False

    @staticmethod
    def canonical_step_payload(step: dict) -> str:
        material = {
            "step_id": step.get("step_id"),
            "action_class": step.get("action_class"),
            "action": step.get("action"),
            "owner": step.get("owner"),
            "preconditions": step.get("preconditions", []),
        }
        return json.dumps(material, sort_keys=True, separators=(",", ":"))

    @classmethod
    def payload_hash(cls, step: dict) -> str:
        return hashlib.sha256(cls.canonical_step_payload(step).encode("utf-8")).hexdigest()

    def approve(self, step: dict, approved_by: str) -> Approval:
        approval = Approval(
            step_id=step["step_id"],
            payload_hash=self.payload_hash(step),
            approved_by=approved_by,
        )
        self.approvals[step["step_id"]] = approval
        return approval

    def approval_is_valid(self, step: dict) -> bool:
        approval = self.approvals.get(step["step_id"])
        if not approval:
            return False
        return approval.payload_hash == self.payload_hash(step)

    def dependencies_satisfied(self, step: dict) -> bool:
        for dep in step.get("depends_on", []):
            result = self.results.get(dep)
            if not result or result.status not in {"COMPLETED", "COMPLETED_UNVERIFIED"}:
                return False
        return True

    def pause(self) -> None:
        self.paused = True

    def resume(self) -> None:
        if not self.cancelled:
            self.paused = False

    def cancel(self) -> None:
        self.cancelled = True
        self.paused = True

    def classify_step(self, step: dict) -> str:
        action_class = step.get("action_class")
        if action_class not in SAFE_CLASSES | {CONSEQUENTIAL_CLASS}:
            raise ValueError(f"Unknown action class: {action_class}")
        return action_class

    def can_execute(self, step: dict) -> tuple[bool, str]:
        if self.cancelled:
            return False, "Plan cancelled"
        if self.paused:
            return False, "Plan paused"
        if not self.dependencies_satisfied(step):
            return False, "Dependencies not satisfied"

        action_class = self.classify_step(step)
        if action_class == CONSEQUENTIAL_CLASS:
            if not step.get("approval_required", True):
                return False, "Consequential step must require approval"
            if not self.approval_is_valid(step):
                return False, "Exact-payload human approval required"
        return True, "Ready"

    def execute_step(self, step: dict, adapter=None) -> StepResult:
        ok, reason = self.can_execute(step)
        if not ok:
            result = StepResult(step["step_id"], "BLOCKED", reason, False)
            self.results[step["step_id"]] = result
            return result

        action_class = self.classify_step(step)

        # Safe default: without an adapter, only simulate the request.
        if adapter is None:
            if action_class == CONSEQUENTIAL_CLASS:
                result = StepResult(
                    step["step_id"],
                    "BLOCKED",
                    "Approval is valid, but no external execution adapter is connected.",
                    False,
                )
            else:
                result = StepResult(
                    step["step_id"],
                    "COMPLETED_UNVERIFIED",
                    f"Prepared/simulated: {step.get('action', '')}",
                    False,
                )
            self.results[step["step_id"]] = result
            return result

        try:
            response = adapter.execute(step)
            verified = bool(response.get("verified", False))
            status = "COMPLETED" if verified else "COMPLETED_UNVERIFIED"
            result = StepResult(step["step_id"], status, response.get("message", status), verified)
        except Exception as exc:  # adapter failure must not cascade silently
            result = StepResult(step["step_id"], "FAILED", str(exc), False)

        self.results[step["step_id"]] = result
        return result

    def run_until_blocked(self, plan: dict, adapter=None) -> List[StepResult]:
        emitted: List[StepResult] = []
        for step in plan.get("steps", []):
            existing = self.results.get(step["step_id"])
            if existing and existing.status in {"COMPLETED", "COMPLETED_UNVERIFIED"}:
                continue
            result = self.execute_step(step, adapter=adapter)
            emitted.append(result)
            if result.status in {"BLOCKED", "FAILED"}:
                break
        return emitted


def example_plan() -> dict:
    return {
        "plan_id": str(uuid.uuid4()),
        "goal": "Resolve RFI-117 release uncertainty",
        "decision_owner": "Project Manager",
        "steps": [
            {
                "step_id": "S1",
                "action_class": "read_only",
                "owner": "Isabel",
                "action": "Confirm current RFI-117 and storefront submittal revisions.",
                "depends_on": [],
                "preconditions": [],
                "approval_required": False,
            },
            {
                "step_id": "S2",
                "action_class": "prepare",
                "owner": "Isabel",
                "action": "Prepare a fact-separated coordination draft.",
                "depends_on": ["S1"],
                "preconditions": [],
                "approval_required": False,
            },
            {
                "step_id": "S3",
                "action_class": "external_consequential",
                "owner": "user",
                "action": "Send the exact reviewed coordination message.",
                "depends_on": ["S2"],
                "preconditions": ["User reviewed exact message"],
                "approval_required": True,
            },
        ],
    }


if __name__ == "__main__":
    plan = example_plan()
    executor = ActionPlanExecutor()
    first_pass = executor.run_until_blocked(plan)
    print(json.dumps([r.__dict__ for r in first_pass], indent=2))
    executor.approve(plan["steps"][2], approved_by="human")
    second_pass = executor.run_until_blocked(plan)
    print(json.dumps([r.__dict__ for r in second_pass], indent=2))
