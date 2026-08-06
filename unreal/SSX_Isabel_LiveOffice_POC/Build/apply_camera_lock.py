import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / 'camera_composition_lock.json'


def find_actor(label: str):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == label:
            return actor
    return None


def apply_camera_lock():
    spec = json.loads(SPEC_PATH.read_text(encoding='utf-8'))
    cam_name = spec['primary_camera']
    camera = find_actor(cam_name)
    if camera is None:
        raise RuntimeError(f'Missing camera actor: {cam_name}')

    c = spec['camera']
    t = c['transform']
    camera.set_actor_location(unreal.Vector(t['x'], t['y'], t['z']), False, False)
    camera.set_actor_rotation(unreal.Rotator(t['pitch'], t['yaw'], t['roll']), False)

    component = camera.get_cine_camera_component()
    component.set_editor_property('current_focal_length', float(c['focal_length_mm']))
    component.set_editor_property('current_aperture', float(c['aperture_fstop']))

    filmback = component.get_editor_property('filmback')
    filmback.sensor_width = float(c['sensor_width_mm'])
    filmback.sensor_height = float(c['sensor_height_mm'])
    component.set_editor_property('filmback', filmback)

    focus = component.get_editor_property('focus_settings')
    try:
        focus.focus_method = unreal.CameraFocusMethod.MANUAL
        focus.manual_focus_distance = float(c['focus_distance_cm'])
        component.set_editor_property('focus_settings', focus)
    except Exception as exc:
        unreal.log_warning(f'Focus settings need manual confirmation: {exc}')

    unreal.log(f'Applied deterministic camera lock to {cam_name}.')
    unreal.log('Review viewport against approved reference; write any approved calibration changes back to camera_composition_lock.json.')


if __name__ == '__main__':
    apply_camera_lock()
