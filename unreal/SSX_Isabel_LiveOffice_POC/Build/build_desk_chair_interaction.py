"""Build Isabel's desk/chair interaction guides and clearance volumes in Unreal.

These actors are guides for production placement and animation alignment. They do
not replace the final desk, chair, or MetaHuman assets.
"""

import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'desk_chair_interaction_spec.json').read_text(encoding='utf-8'))
OFFICE = json.loads((ROOT / 'office_spec.json').read_text(encoding='utf-8'))
TAG = unreal.Name('ISABEL_INTERACTION_GUIDE')
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def add_tag(actor):
    tags = list(actor.tags)
    if TAG not in tags:
        tags.append(TAG)
    actor.tags = tags


def spawn_cube(label, loc, size):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*loc))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(unreal.Vector(size[0] / 100.0, size[1] / 100.0, size[2] / 100.0))
    add_tag(actor)
    return actor


def spawn_target(label, loc, yaw=0):
    actor = ELL.spawn_actor_from_class(unreal.TargetPoint, unreal.Vector(*loc), unreal.Rotator(0, yaw, 0))
    actor.set_actor_label(label)
    add_tag(actor)
    return actor


def remove_old_guides():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def main():
    remove_old_guides()
    desk = OFFICE['desk']
    anchors = OFFICE['anchors']
    spec = SPEC

    # Knee clearance box: should remain unobstructed by production desk geometry.
    clear = spec['desk']
    knee_center = (
        desk['x'],
        desk['y'],
        clear['clear_knee_height'] / 2,
    )
    spawn_cube(
        'GUIDE_DESK_KNEE_CLEARANCE',
        knee_center,
        (clear['clear_knee_width'], clear['clear_knee_depth'], clear['clear_knee_height'])
    )

    seated = anchors['ISABEL_DESK_SEATED']
    standing = anchors['ISABEL_DESK_STAND']
    spawn_target('GUIDE_ISABEL_SEATED_HIP', (seated['x'], seated['y'], spec['chair']['seat_height']), seated['yaw'])
    spawn_target('GUIDE_ISABEL_STAND', (standing['x'], standing['y'], standing['z']), standing['yaw'])

    # Chair travel path used by sit/stand choreography.
    push = spec['chair']['pushback_distance']
    spawn_target('GUIDE_CHAIR_HOME', (seated['x'], seated['y'], 0), seated['yaw'])
    spawn_target('GUIDE_CHAIR_PUSHBACK', (seated['x'], seated['y'] + push, 0), seated['yaw'])

    # Approximate foot/knee clearance zones to catch obvious collisions before animation tuning.
    spawn_cube('GUIDE_FOOT_CLEARANCE', (seated['x'] - 28, seated['y'] - 28, 10), (66, 64, 20))
    spawn_cube('GUIDE_KNEE_ARC', (seated['x'] - 18, seated['y'] - 8, 52), (72, 70, 60))

    unreal.log('=== Isabel desk/chair interaction guides created ===')
    unreal.log('Replace the blockout desk/chair only if all guide volumes remain unobstructed.')


main()
