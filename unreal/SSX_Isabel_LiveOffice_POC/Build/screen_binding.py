"""Bind physical Unreal monitor actors to live SSX web routes.

Proof-of-concept layer: validates SCREEN_01..04, resolves their configured route,
and produces a runtime binding record. On the home AI computer this plugs into
Unreal's browser/media surface implementation so monitor content can refresh
without rebuilding the office geometry.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any

ROOT = Path(__file__).resolve().parent
REGISTRY_PATH = ROOT / "live_screen_registry.json"


@dataclass(frozen=True)
class ScreenBinding:
    screen_id: str
    actor_label: str
    role: str
    path: str
    source_type: str
    refresh_mode: str


def load_registry() -> Dict[str, Any]:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def get_binding(screen_id: str) -> ScreenBinding:
    registry = load_registry()
    try:
        cfg = registry["screens"][screen_id]
    except KeyError as exc:
        raise ValueError(f"Unknown live office screen: {screen_id}") from exc

    return ScreenBinding(
        screen_id=screen_id,
        actor_label=screen_id,
        role=cfg["role"],
        path=cfg["default_path"],
        source_type=cfg["source_type"],
        refresh_mode=cfg["refresh_mode"],
    )


def all_bindings() -> list[ScreenBinding]:
    registry = load_registry()
    return [get_binding(screen_id) for screen_id in registry["screens"]]


def resolve_url(screen_id: str, base_url: str) -> str:
    binding = get_binding(screen_id)
    return f"{base_url.rstrip('/')}{binding.path}"


def validate() -> None:
    expected = {"SCREEN_01", "SCREEN_02", "SCREEN_03", "SCREEN_04"}
    actual = {b.screen_id for b in all_bindings()}
    if actual != expected:
        raise ValueError(f"Screen registry mismatch. Expected {sorted(expected)}, got {sorted(actual)}")


if __name__ == "__main__":
    validate()
    for binding in all_bindings():
        print(binding)
