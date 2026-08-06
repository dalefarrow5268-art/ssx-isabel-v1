"""Runtime-neutral screen refresh/fallback controller for Isabel live office."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

ROOT = Path(__file__).resolve().parent
REGISTRY_PATH = ROOT / "live_screen_registry.json"
STATE_PATH = ROOT / "screen_runtime_state.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


@dataclass(frozen=True)
class ScreenRefreshMessage:
    screen_id: str
    url: str
    reason: str = "data_update"

    def validate(self) -> None:
        registry = load_json(REGISTRY_PATH)
        if self.screen_id not in registry["screens"]:
            raise ValueError(f"Unknown screen id: {self.screen_id}")
        if not self.url.startswith(("http://", "https://", "/")):
            raise ValueError("Screen URL must be absolute http(s) or app-relative")


def request_refresh(screen_id: str, url: str, reason: str = "data_update") -> Dict[str, Any]:
    msg = ScreenRefreshMessage(screen_id, url, reason)
    msg.validate()
    return {
        "type": "screen-refresh",
        "version": 1,
        "screenId": screen_id,
        "url": url,
        "reason": reason,
        "issuedAt": _utc_now(),
    }


def mark_success(screen_id: str, url: str) -> Dict[str, Any]:
    state = load_json(STATE_PATH)
    s = state["screens"][screen_id]
    s.update({"status": "live", "last_good_url": url, "last_refresh": _utc_now(), "error": None})
    save_json(STATE_PATH, state)
    return s


def mark_failure(screen_id: str, error: str) -> Dict[str, Any]:
    state = load_json(STATE_PATH)
    s = state["screens"][screen_id]
    s.update({"status": "fallback", "last_refresh": _utc_now(), "error": error})
    save_json(STATE_PATH, state)
    return {
        "screen": s,
        "fallback": state["fallback"],
    }


if __name__ == "__main__":
    print(json.dumps(request_refresh("SCREEN_02", "/screens/schedule", "smoke_test"), indent=2))
