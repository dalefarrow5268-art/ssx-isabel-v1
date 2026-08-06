from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MATRIX = ROOT / 'runtime_smoke_matrix.json'
REPORT = ROOT / 'latest_runtime_smoke_report.json'


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def actor_labels():
    try:
        import unreal
        return {a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors()}
    except Exception:
        return set()


def test_scene_requirements(test, labels):
    missing = [name for name in test.get('requires', []) if name not in labels]
    return (not missing), {'missing': missing}


def test_command(test):
    from office_command_receiver import resolve_command
    action = resolve_command(test['command'])
    expect = test.get('expect', {})
    ok = all(action.get(k) == v for k, v in expect.items())
    return ok, {'action': action}


def run():
    matrix = load_json(MATRIX)
    labels = actor_labels()
    results = []

    for test in matrix['tests']:
        try:
            if 'requires' in test:
                ok, detail = test_scene_requirements(test, labels)
            elif 'command' in test:
                ok, detail = test_command(test)
            elif test['id'] == 'continuity.stable_resume':
                required = ROOT / 'office_continuity.py'
                ok, detail = required.exists(), {'file': str(required)}
            elif test['id'] == 'screens.routes':
                required = ROOT / 'live_screen_registry.json'
                ok, detail = required.exists(), {'file': str(required)}
            elif test['id'] == 'pixel_streaming.frontend':
                required = ROOT / 'run_pixel_streaming_local.ps1'
                ok, detail = required.exists(), {'file': str(required)}
            else:
                ok, detail = False, {'reason': 'unknown test'}
        except Exception as exc:
            ok, detail = False, {'error': repr(exc)}

        results.append({
            'id': test['id'],
            'severity': test['severity'],
            'ok': ok,
            'detail': detail,
        })

    fatals = [r for r in results if r['severity'] == 'fatal' and not r['ok']]
    warnings = [r for r in results if r['severity'] == 'warning' and not r['ok']]
    report = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': 'PASS' if not fatals else 'BLOCKED',
        'fatal_failures': len(fatals),
        'warnings': len(warnings),
        'results': results,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    run()
