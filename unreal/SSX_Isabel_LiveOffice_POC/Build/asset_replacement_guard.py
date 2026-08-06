"""Guard production asset swaps from moving locked Isabel office geometry.

Run after replacing blockout meshes. It compares current actor transforms against
locked values from office_spec.json and reports anything outside tolerance.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / 'office_spec.json'
TOLERANCE_CM = 1.0
TOLERANCE_DEG = 0.5

LOCKED_ACTORS = {
    'CAMERA_ARRIVAL': 'camera_arrival',
    'ISABEL_ANCHOR_DESK_SEATED': ('anchors', 'ISABEL_DESK_SEATED'),
    'ISABEL_ANCHOR_DESK_STAND': ('anchors', 'ISABEL_DESK_STAND'),
    'SCREEN_01_VIEW': ('anchors', 'SCREEN_01_VIEW'),
    'SCREEN_02_VIEW': ('anchors', 'SCREEN_02_VIEW'),
    'SCREEN_03_VIEW': ('anchors', 'SCREEN_03_VIEW'),
    'SCREEN_04_VIEW': ('anchors', 'SCREEN_04_VIEW'),
}


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding='utf-8'))


def expected_transform(spec, mapping):
    if mapping == 'camera_arrival':
        c = spec['camera_arrival']
        return (c['x'], c['y'], c['z'], c['yaw'])
    section, name = mapping
    a = spec[section][name]
    return (a['x'], a['y'], a['z'], a.get('yaw', 0))


def validate_snapshot(snapshot: dict) -> list[str]:
    spec = load_spec()
    errors = []
    for actor_name, mapping in LOCKED_ACTORS.items():
        actual = snapshot.get(actor_name)
        if not actual:
            errors.append(f'Missing actor: {actor_name}')
            continue
        ex, ey, ez, eyaw = expected_transform(spec, mapping)
        for key, expected in [('x', ex), ('y', ey), ('z', ez)]:
            actual_value = float(actual.get(key, 0))
            if abs(actual_value - float(expected)) > TOLERANCE_CM:
                errors.append(f'{actor_name}.{key} moved: {actual_value} vs {expected}')
        actual_yaw = float(actual.get('yaw', 0))
        if abs(actual_yaw - float(eyaw)) > TOLERANCE_DEG:
            errors.append(f'{actor_name}.yaw moved: {actual_yaw} vs {eyaw}')
    return errors


if __name__ == '__main__':
    print('Asset replacement guard is ready. Runtime Unreal adapter supplies actor snapshot on Saturday.')
