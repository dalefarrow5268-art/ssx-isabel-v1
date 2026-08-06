"""Master Isabel Live Office assembly runner.

Run this inside Unreal Python after first-launch bootstrap. It assembles the
production guides in a fixed order so visual upgrades cannot silently move the
locked office layout.
"""

from __future__ import annotations

import importlib.util
import pathlib
import traceback
import unreal

ROOT = pathlib.Path(__file__).resolve().parent

STEPS = [
    "build_live_office.py",
    "build_production_monitor_wall.py",
    "build_desk_chair_interaction_guides.py",
    "apply_window_daylight.py",
    "build_tray_ceiling.py",
    "build_flatiron_frame.py",
    "build_floor_foreground_guides.py",
    "apply_camera_lock.py",
]


def run_script(filename: str) -> tuple[bool, str]:
    path = ROOT / filename
    if not path.exists():
        return False, f"missing: {filename}"
    try:
        spec = importlib.util.spec_from_file_location(f"isabel_{path.stem}", path)
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        return True, filename
    except Exception as exc:
        unreal.log_error(f"[Isabel Assembly] {filename} failed: {exc}")
        unreal.log_error(traceback.format_exc())
        return False, f"{filename}: {exc}"


def main() -> None:
    unreal.log("=== ISABEL LIVE OFFICE: MASTER ASSEMBLY START ===")
    failures: list[str] = []
    for filename in STEPS:
        ok, message = run_script(filename)
        if ok:
            unreal.log(f"[PASS] {message}")
        else:
            failures.append(message)
            unreal.log_error(f"[FAIL] {message}")

    if failures:
        unreal.log_error("=== ISABEL LIVE OFFICE: ASSEMBLY NEEDS ATTENTION ===")
        for item in failures:
            unreal.log_error(item)
    else:
        unreal.log("=== ISABEL LIVE OFFICE: MASTER ASSEMBLY COMPLETE ===")
        unreal.log("Next: run project_health_report.py, then validate CAMERA_ARRIVAL before material polishing.")


main()
