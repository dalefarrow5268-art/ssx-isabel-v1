"""Generate a compact health report for the Isabel Live Office POC.

Designed to run both outside Unreal (filesystem checks) and inside Unreal
(actor/plugin/runtime checks when the unreal module is available).
"""
from __future__ import annotations

import json
import platform
import shutil
import socket
from dataclasses import dataclass, asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
SPEC = ROOT / 'office_spec.json'
REQUIRED_FILES = [
    ROOT / 'build_live_office.py',
    ROOT / 'office_spec.json',
    ROOT / 'anchor_registry.py',
    ROOT / 'office_command_receiver.py',
    ROOT / 'live_screen_registry.json',
    ROOT / 'isabel_behavior_state.json',
    ROOT / 'project_health_report.py',
    PROJECT_ROOT / 'SSX_Isabel_LiveOffice_POC.uproject',
]
REQUIRED_ACTORS = [
    'CAMERA_ARRIVAL',
    'SCREEN_01', 'SCREEN_02', 'SCREEN_03', 'SCREEN_04',
    'ISABEL_CHARACTER',
    'ISABEL_DESK_SEATED', 'ISABEL_DESK_STAND',
    'SCREEN_01_VIEW', 'SCREEN_02_VIEW', 'SCREEN_03_VIEW', 'SCREEN_04_VIEW',
    'USER_FOCUS',
]

@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def port_free(port: int) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def filesystem_checks():
    checks = []
    checks.append(Check('platform', platform.system() == 'Windows', platform.platform()))
    checks.append(Check('git', shutil.which('git') is not None, shutil.which('git') or 'not found'))
    for p in REQUIRED_FILES:
        checks.append(Check(f'file:{p.name}', p.exists(), str(p)))
    for port in (80, 443, 8888, 8889):
        checks.append(Check(f'port:{port}', port_free(port), 'free' if port_free(port) else 'in use'))
    return checks


def unreal_checks():
    checks = []
    try:
        import unreal
    except Exception as exc:
        return [Check('unreal_runtime', False, f'not available: {exc}')]

    checks.append(Check('unreal_runtime', True, str(unreal.SystemLibrary.get_engine_version())))
    actors = {a.get_actor_label(): a for a in unreal.EditorLevelLibrary.get_all_level_actors()}
    for label in REQUIRED_ACTORS:
        checks.append(Check(f'actor:{label}', label in actors, 'present' if label in actors else 'missing'))
    return checks


def build_report():
    checks = filesystem_checks() + unreal_checks()
    failed = [c for c in checks if not c.ok]
    return {
        'project': 'SSX_Isabel_LiveOffice_POC',
        'status': 'PASS' if not failed else 'NEEDS_ATTENTION',
        'passed': sum(1 for c in checks if c.ok),
        'failed': len(failed),
        'checks': [asdict(c) for c in checks],
        'next_action': 'Proceed to Pixel Streaming smoke test.' if not failed else 'Fix failed checks before continuing.',
    }


def main():
    report = build_report()
    out = ROOT / 'latest_health_report.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    return report

if __name__ == '__main__':
    main()
