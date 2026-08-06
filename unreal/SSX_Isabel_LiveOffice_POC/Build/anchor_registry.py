import json
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class Anchor:
    name: str
    x: float
    y: float
    z: float
    yaw: float
    role: str


def load_spec(spec_path: str | Path) -> Dict[str, Any]:
    path = Path(spec_path)
    return json.loads(path.read_text(encoding='utf-8'))


def load_anchors(spec_path: str | Path) -> Dict[str, Anchor]:
    spec = load_spec(spec_path)
    anchors: Dict[str, Anchor] = {}
    for name, raw in spec.get('anchors', {}).items():
        anchors[name] = Anchor(
            name=name,
            x=float(raw['x']),
            y=float(raw['y']),
            z=float(raw['z']),
            yaw=float(raw.get('yaw', 0)),
            role=str(raw.get('role', 'generic')),
        )
    return anchors


def resolve_interaction(spec_path: str | Path, target_name: str) -> Dict[str, Any]:
    spec = load_spec(spec_path)
    target = spec['interaction_targets'][target_name]
    anchor_name = target['anchor']
    anchor = spec['anchors'][anchor_name]
    return {
        'target': target_name,
        'anchor_name': anchor_name,
        'anchor': anchor,
        'look_target': target.get('look_target'),
        'gesture_target': target.get('gesture_target'),
    }


def validate_spec(spec_path: str | Path) -> None:
    spec = load_spec(spec_path)
    anchors = spec.get('anchors', {})
    targets = spec.get('interaction_targets', {})

    required_anchors = {
        'ISABEL_DESK_SEATED',
        'ISABEL_DESK_STAND',
        'SCREEN_01_VIEW',
        'SCREEN_02_VIEW',
        'SCREEN_03_VIEW',
        'SCREEN_04_VIEW',
        'USER_FOCUS',
    }
    missing = required_anchors - set(anchors)
    if missing:
        raise ValueError(f'Missing required anchors: {sorted(missing)}')

    for target_name, target in targets.items():
        anchor_name = target.get('anchor')
        if anchor_name not in anchors:
            raise ValueError(f'{target_name} references unknown anchor {anchor_name!r}')


if __name__ == '__main__':
    spec_file = Path(__file__).with_name('office_spec.json')
    validate_spec(spec_file)
    print(f'Validated {len(load_anchors(spec_file))} office anchors.')
