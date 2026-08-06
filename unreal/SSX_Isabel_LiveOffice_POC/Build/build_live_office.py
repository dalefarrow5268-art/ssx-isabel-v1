import json
import os
import unreal

TAG = 'ISABEL_POC'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_PATH = os.path.join(ROOT, 'Build', 'office_spec.json')

with open(SPEC_PATH, 'r', encoding='utf-8') as f:
    SPEC = json.load(f)

ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def cm_scale(x, y, z):
    return unreal.Vector(x / 100.0, y / 100.0, z / 100.0)


def add_tag(actor, extra=None):
    tags = list(actor.tags)
    tags.append(unreal.Name(TAG))
    if extra:
        tags.append(unreal.Name(extra))
    actor.tags = tags


def cube(label, loc, size, rot=(0, 0, 0)):
    actor = ELL.spawn_actor_from_object(
        CUBE,
        unreal.Vector(*loc),
        unreal.Rotator(rot[0], rot[1], rot[2]),
    )
    actor.set_actor_label(label)
    actor.set_actor_scale3d(cm_scale(*size))
    add_tag(actor)
    return actor


def target_point(label, raw, role='anchor'):
    actor = ELL.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(raw['x'], raw['y'], raw['z']),
        unreal.Rotator(0, raw.get('yaw', 0), 0),
    )
    actor.set_actor_label(label)
    add_tag(actor, f'ISABEL_{role.upper()}')
    return actor


def destroy_previous():
    for actor in ELL.get_all_level_actors():
        if unreal.Name(TAG) in actor.tags:
            ELL.destroy_actor(actor)


def build_shell():
    r = SPEC['room']
    w, d, h, t = r['width'], r['depth'], r['height'], r['wall_thickness']

    cube('OFFICE_FLOOR', (0, 0, -5), (w, d, 10))
    cube('OFFICE_CEILING', (0, 0, h + 5), (w, d, 10))
    cube('BACK_WALL', (0, -d / 2, h / 2), (w, t, h))
    cube('RIGHT_WALL', (w / 2, 0, h / 2), (t, d, h))

    x = -w / 2
    win = SPEC['windows']
    sill = win['sill_height']
    head = win['head_height']
    fw = win['frame_width']
    cube('LEFT_SILL', (x, 0, sill / 2), (t, d, sill))
    cube('LEFT_HEADER', (x, 0, head + (h - head) / 2), (t, d, h - head))
    bay = d / win['bay_count']
    for i in range(win['bay_count'] + 1):
        y = -d / 2 + i * bay
        cube(f'WINDOW_MULLION_{i+1:02d}', (x, y, (sill + head) / 2), (t, fw, head - sill))


def build_monitor_wall():
    r = SPEC['room']
    m = SPEC['monitor_wall']
    d = r['depth']
    sw, sh, sd = m['screen_width'], m['screen_height'], m['screen_depth']
    gx, gy = m['gap_x'], m['gap_y']
    center_z = m['center_height']

    total_w = 2 * sw + gx
    total_h = 2 * sh + gy
    x0 = -total_w / 2 + sw / 2
    z0 = center_z + total_h / 2 - sh / 2
    y = -d / 2 + r['wall_thickness'] / 2 + sd / 2 + 2

    reveal = m['white_reveal']
    cube('MONITOR_WHITE_REVEAL', (0, y - 3, center_z), (total_w + 2 * reveal, 4, total_h + 2 * reveal))

    screen_num = 1
    for row in range(2):
        for col in range(2):
            x = x0 + col * (sw + gx)
            z = z0 - row * (sh + gy)
            cube(f'SCREEN_{screen_num:02d}', (x, y, z), (sw, sd, sh))
            screen_num += 1


def build_desk():
    d = SPEC['desk']
    cube('DESK_TOP', (d['x'], d['y'], d['height']), (d['width'], d['depth'], 6))
    leg_offset = d['width'] * 0.42
    cube('DESK_LEG_A', (d['x'] - leg_offset, d['y'], d['height'] / 2), (8, d['depth'] * 0.7, d['height']))
    cube('DESK_LEG_B', (d['x'] + leg_offset, d['y'], d['height'] / 2), (8, d['depth'] * 0.7, d['height']))


def build_anchor_points():
    for name, raw in SPEC.get('anchors', {}).items():
        target_point(f'ANCHOR_{name}', raw, raw.get('role', 'anchor'))

    for name, target in SPEC.get('interaction_targets', {}).items():
        look = target.get('look_target')
        gesture = target.get('gesture_target')
        if look:
            target_point(f'LOOK_{name}', {**look, 'yaw': 0}, 'look_target')
        if gesture:
            target_point(f'GESTURE_{name}', {**gesture, 'yaw': 0}, 'gesture_target')


def build_camera():
    c = SPEC['camera_arrival']
    cam = ELL.spawn_actor_from_class(
        unreal.CineCameraActor,
        unreal.Vector(c['x'], c['y'], c['z']),
        unreal.Rotator(c['pitch'], c['yaw'], c['roll'])
    )
    cam.set_actor_label('CAMERA_ARRIVAL')
    add_tag(cam)
    try:
        cam.get_cine_camera_component().set_editor_property('current_focal_length', c['focal_length_mm'])
    except Exception as exc:
        unreal.log_warning(f'Could not set focal length automatically: {exc}')


def build_lights():
    sun = ELL.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 250), unreal.Rotator(-35, -35, 0))
    sun.set_actor_label('SUN_DAYLIGHT')
    add_tag(sun)
    try:
        sun.directional_light_component.set_editor_property('intensity', 4.0)
    except Exception:
        pass

    sky = ELL.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 200))
    sky.set_actor_label('SKYLIGHT')
    add_tag(sky)
    try:
        sky.light_component.set_editor_property('intensity', 1.0)
    except Exception:
        pass


def main():
    unreal.log('=== ISABEL LIVE OFFICE: rebuilding POC blockout ===')
    destroy_previous()
    build_shell()
    build_monitor_wall()
    build_desk()
    build_anchor_points()
    build_camera()
    build_lights()
    unreal.log(f"=== ISABEL LIVE OFFICE: blockout complete; {len(SPEC.get('anchors', {}))} movement anchors built ===")
    unreal.log('Save the level as Content/Maps/Isabel_LiveOffice_POC after reviewing the camera view.')


main()
