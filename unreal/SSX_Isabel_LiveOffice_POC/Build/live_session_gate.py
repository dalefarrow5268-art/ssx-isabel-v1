from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List


class GateState(str, Enum):
    BOOTING = "BOOTING"
    CHECKING = "CHECKING"
    REPAIRING = "REPAIRING"
    DEGRADED = "DEGRADED"
    READY = "READY"
    BLOCKED = "BLOCKED"


@dataclass
class CheckResult:
    name: str
    ok: bool
    fatal: bool = False
    repairable: bool = False
    detail: str = ""


@dataclass
class GateReport:
    state: GateState
    checks: List[CheckResult] = field(default_factory=list)
    repairs_attempted: List[str] = field(default_factory=list)
    degraded_reasons: List[str] = field(default_factory=list)

    @property
    def ready(self) -> bool:
        return self.state == GateState.READY


class LiveSessionGate:
    """POC live-session gate.

    This class intentionally keeps transport/runtime details behind injected probes and
    repair callbacks so Saturday's Unreal/Pixel Streaming hookup can bind the actual
    UE 5.7 APIs without changing the gate policy.
    """

    def __init__(
        self,
        probes: Dict[str, Callable[[], CheckResult]],
        repairs: Dict[str, Callable[[], bool]] | None = None,
        max_repair_attempts: int = 3,
    ) -> None:
        self.probes = probes
        self.repairs = repairs or {}
        self.max_repair_attempts = max_repair_attempts

    def evaluate(self) -> GateReport:
        report = GateReport(state=GateState.CHECKING)

        first_pass = [probe() for probe in self.probes.values()]
        report.checks.extend(first_pass)

        if any((not c.ok) and c.fatal for c in first_pass):
            report.state = GateState.BLOCKED
            return report

        repair_targets = [c for c in first_pass if (not c.ok) and c.repairable]
        if repair_targets:
            report.state = GateState.REPAIRING

        for check in repair_targets:
            repair = self.repairs.get(check.name)
            if repair is None:
                report.degraded_reasons.append(f"{check.name}: no repair adapter")
                continue

            repaired = False
            for attempt in range(1, self.max_repair_attempts + 1):
                report.repairs_attempted.append(f"{check.name}#{attempt}")
                if repair():
                    repaired = True
                    break

            if not repaired:
                report.degraded_reasons.append(f"{check.name}: repair exhausted")

        second_pass = [probe() for probe in self.probes.values()]
        report.checks = second_pass

        if any((not c.ok) and c.fatal for c in second_pass):
            report.state = GateState.BLOCKED
            return report

        unresolved = [c for c in second_pass if not c.ok]
        if unresolved:
            report.state = GateState.DEGRADED
            for c in unresolved:
                reason = f"{c.name}: {c.detail or 'not ready'}"
                if reason not in report.degraded_reasons:
                    report.degraded_reasons.append(reason)
            return report

        report.state = GateState.READY
        return report


def browser_live_status(report: GateReport) -> Dict[str, Any]:
    """Return the minimum truth the web shell needs before displaying LIVE."""
    return {
        "type": "live-session-gate",
        "state": report.state.value,
        "live": report.ready,
        "repairsAttempted": report.repairs_attempted,
        "degradedReasons": report.degraded_reasons,
        "checks": [
            {
                "name": c.name,
                "ok": c.ok,
                "fatal": c.fatal,
                "repairable": c.repairable,
                "detail": c.detail,
            }
            for c in report.checks
        ],
    }


def example_poc_gate() -> LiveSessionGate:
    state = {
        "unreal_runtime": True,
        "pixel_streaming_data_channel": True,
        "isabel_character": True,
        "camera_lock": True,
        "identity_lock": True,
        "geometry_lock": True,
        "screens": True,
        "state_backbone": True,
        "event_transport": True,
        "command_receiver": True,
    }

    def probe(name: str, *, fatal: bool = False, repairable: bool = False) -> Callable[[], CheckResult]:
        return lambda: CheckResult(
            name=name,
            ok=bool(state[name]),
            fatal=fatal,
            repairable=repairable,
            detail="ok" if state[name] else "unavailable",
        )

    probes = {
        "unreal_runtime": probe("unreal_runtime", fatal=True),
        "pixel_streaming_data_channel": probe("pixel_streaming_data_channel", repairable=True),
        "isabel_character": probe("isabel_character", fatal=True),
        "camera_lock": probe("camera_lock", fatal=True),
        "identity_lock": probe("identity_lock", fatal=True),
        "geometry_lock": probe("geometry_lock", fatal=True),
        "screens": probe("screens", repairable=True),
        "state_backbone": probe("state_backbone", fatal=True),
        "event_transport": probe("event_transport", fatal=True),
        "command_receiver": probe("command_receiver", fatal=True),
    }

    def repair_pixel_streaming() -> bool:
        state["pixel_streaming_data_channel"] = True
        return True

    def repair_screens() -> bool:
        state["screens"] = True
        return True

    return LiveSessionGate(
        probes=probes,
        repairs={
            "pixel_streaming_data_channel": repair_pixel_streaming,
            "screens": repair_screens,
        },
    )


if __name__ == "__main__":
    gate = example_poc_gate()
    result = gate.evaluate()
    print(browser_live_status(result))
