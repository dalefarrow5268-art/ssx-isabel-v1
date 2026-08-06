"""Apply the production window/daylight setup to the Isabel live-office level."""

import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'window_daylight_spec.json').read_text(encoding='utf-8'))
TAG = unreal.Name('ISABEL_WINDOW_DAYLIGHT')
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def tagged(actor):
    tags = list(actor.tags)
    if TAG not in tags:
        tags.append(TAG)
    actor.tags = tags
    return actor


def clear_previous():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def cube(label, loc, scale_cm):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*loc))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(unreal.Vector(scale_cm[0] / 100.0, scale_cm[1] / 100.0, scale_cm[2] / 100.0))
    return tagged(actor)


def build_window_guides():
    room_width = 670
    room_depth = 790
    room_height = 335
    w = SPEC['window_wall']
    x = -room_width / 2
    sill = w['sill_height_cm']
    head = w['head_height_cm']
    depth = w['frame_depth_cm']
    mullion = w['mullion_width_cm']
    bays = w['bay_count']

    # Production frame guides only; final assets/materials replace these without moving them.
    cube('PROD_WINDOW_SILL', (x, 0, sill / 2), (depth, room_depth, sill))
    cube('PROD_WINDOW_HEADER', (x, 0, head + (room_height - head) / 2), (depth, room_depth, room_height - head))
    bay = room_depth / bays
    for i in range(bays + 1):
        y = -room_depth / 2 + i * bay
        cube(f'PROD_WINDOW_MULLION_{i+1:02d}', (x, y, (sill + head) / 2), (depth, mullion, head - sill))


def configure_daylight():
    d = SPEC['daylight']
    sun = ELL.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(0, 0, 280),
        unreal.Rotator(-float(d['sun_angle_deg']), float(d['sun_yaw_deg']), 0),
    )
    sun.set_actor_label('PROD_SUN_DAYLIGHT')
    tagged(sun)

    sky = ELL.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 220))
    sky.set_actor_label('PROD_SKYLIGHT')
    tagged(sky)

    try:
        sun.directional_light_component.set_editor_property('intensity', 3.5)
        sky.light_component.set_editor_property('intensity', 0.8)
    except Exception as exc:
        unreal.log_warning(f'Window/daylight intensity setup needs manual tuning: {exc}')


def main():
    unreal.log('=== ISABEL: applying production window/daylight guides ===')
    clear_previous()
    build_window_guides()
    configure_daylight()
    unreal.log('Window/daylight guides created. Tune final glass, exterior and exposure on the home GPU.')


main()
