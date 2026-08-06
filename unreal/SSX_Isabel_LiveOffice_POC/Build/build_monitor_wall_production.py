import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'monitor_wall_production_spec.json').read_text(encoding='utf-8'))
OFFICE = json.loads((ROOT / 'office_spec.json').read_text(encoding='utf-8'))

TAG = unreal.Name('ISABEL_MONITOR_PRODUCTION')
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def scale_cm(x, y, z):
    return unreal.Vector(x / 100.0, y / 100.0, z / 100.0)


def spawn_box(label, loc, size):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*loc))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(scale_cm(*size))
    actor.tags = list(actor.tags) + [TAG]
    return actor


def clear_previous():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def build():
    clear_previous()

    mg = SPEC['monitor_group']
    reveal = SPEC['white_mat_reveal']['width_all_sides']
    bezel = SPEC['screen_frame']
    room_depth = OFFICE['room']['depth']
    wall_t = OFFICE['room']['wall_thickness']

    sw = mg['screen_width']
    sh = mg['screen_height']
    sd = mg['screen_depth']
    gx = mg['horizontal_gap']
    gy = mg['vertical_gap']
    cx = mg['center_x']
    cz = mg['center_height']

    group_w = 2 * sw + gx
    group_h = 2 * sh + gy
    outer_w = group_w + 2 * reveal
    outer_h = group_h + 2 * reveal

    y_screen = -room_depth / 2 + wall_t / 2 + sd / 2 + 2
    y_reveal = y_screen - sd / 2 - 0.8
    y_cab = y_reveal - 2.2

    spawn_box('PROD_MONITOR_WHITE_REVEAL', (cx, y_reveal, cz), (outer_w, 1.6, outer_h))

    border = SPEC['cabinetry']['minimum_visible_border']
    cabinet_depth = 8.0
    side_h = outer_h + 2 * border
    top_w = outer_w + 2 * border
    spawn_box('PROD_CAB_LEFT', (cx - outer_w / 2 - border / 2, y_cab, cz), (border, cabinet_depth, side_h))
    spawn_box('PROD_CAB_RIGHT', (cx + outer_w / 2 + border / 2, y_cab, cz), (border, cabinet_depth, side_h))
    spawn_box('PROD_CAB_TOP', (cx, y_cab, cz + outer_h / 2 + border / 2), (top_w, cabinet_depth, border))
    spawn_box('PROD_CAB_BOTTOM', (cx, y_cab, cz - outer_h / 2 - border / 2), (top_w, cabinet_depth, border))

    x_left = cx - (gx / 2 + sw / 2)
    x_right = cx + (gx / 2 + sw / 2)
    z_top = cz + (gy / 2 + sh / 2)
    z_bottom = cz - (gy / 2 + sh / 2)

    positions = [
        ('SCREEN_01', x_left, z_top),
        ('SCREEN_02', x_right, z_top),
        ('SCREEN_03', x_left, z_bottom),
        ('SCREEN_04', x_right, z_bottom),
    ]

    bw = bezel['bezel_width']
    bd = bezel['bezel_depth']
    for label, x, z in positions:
        # Keep existing logical screen actor names available to runtime.
        spawn_box(f'PROD_{label}_PANEL', (x, y_screen, z), (sw, sd, sh))
        frame_y = y_screen + sd / 2 + bd / 2
        spawn_box(f'PROD_{label}_BEZEL_TOP', (x, frame_y, z + sh / 2 - bw / 2), (sw, bd, bw))
        spawn_box(f'PROD_{label}_BEZEL_BOTTOM', (x, frame_y, z - sh / 2 + bw / 2), (sw, bd, bw))
        spawn_box(f'PROD_{label}_BEZEL_LEFT', (x - sw / 2 + bw / 2, frame_y, z), (bw, bd, sh - 2 * bw))
        spawn_box(f'PROD_{label}_BEZEL_RIGHT', (x + sw / 2 - bw / 2, frame_y, z), (bw, bd, sh - 2 * bw))

    unreal.log('=== Isabel production monitor wall geometry created ===')
    unreal.log(f'Monitor group: {group_w:.2f} x {group_h:.2f} cm; reveal: {reveal:.2f} cm all sides')


build()
