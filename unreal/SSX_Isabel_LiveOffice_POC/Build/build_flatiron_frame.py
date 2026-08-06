import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'flatiron_artwork_spec.json').read_text(encoding='utf-8'))
TAG = unreal.Name('ISABEL_FLATIRON_FRAME')
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def _spawn_cube(label, location, size):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*location))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(unreal.Vector(size[0] / 100.0, size[1] / 100.0, size[2] / 100.0))
    actor.tags = list(actor.tags) + [TAG]
    return actor


def _find_actor(label):
    for actor in ELL.get_all_level_actors():
        if actor.get_actor_label() == label:
            return actor
    return None


def clear_previous():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def build():
    clear_previous()
    cfg = SPEC
    anchor = _find_actor('ANCHOR_ISABEL_DESK_SEATED') or _find_actor('ISABEL_ANCHOR_DESK')
    if not anchor:
        raise RuntimeError('Isabel seated anchor not found. Run the office builder first.')

    # The frame is placed on Isabel's wall as independent geometry. Exact wall-facing
    # coordinate is tuned on the home GPU after the first camera review.
    a = anchor.get_actor_location()
    center = (a.x + 145, a.y - 10, cfg['artwork']['placement']['center_height_cm'])
    ow = cfg['frame']['outer_width_cm']
    oh = cfg['frame']['outer_height_cm']
    fw = cfg['frame']['frame_face_width_cm']
    fd = cfg['frame']['frame_depth_cm']
    mat = cfg['mat']['visible_width_cm']

    # Backing/art surface plane.
    _spawn_cube('FLATIRON_ART_BACKING', center, (ow - 2 * (fw + mat), 1.0, oh - 2 * (fw + mat)))

    # White mat as four independent strips.
    inner_w = ow - 2 * fw
    inner_h = oh - 2 * fw
    _spawn_cube('FLATIRON_MAT_TOP', (center[0], center[1] - 0.6, center[2] + (inner_h - mat) / 2), (inner_w, 1.2, mat))
    _spawn_cube('FLATIRON_MAT_BOTTOM', (center[0], center[1] - 0.6, center[2] - (inner_h - mat) / 2), (inner_w, 1.2, mat))
    _spawn_cube('FLATIRON_MAT_LEFT', (center[0] - (inner_w - mat) / 2, center[1] - 0.6, center[2]), (mat, 1.2, inner_h - 2 * mat))
    _spawn_cube('FLATIRON_MAT_RIGHT', (center[0] + (inner_w - mat) / 2, center[1] - 0.6, center[2]), (mat, 1.2, inner_h - 2 * mat))

    # Black frame rails.
    _spawn_cube('FLATIRON_FRAME_TOP', (center[0], center[1], center[2] + (oh - fw) / 2), (ow, fd, fw))
    _spawn_cube('FLATIRON_FRAME_BOTTOM', (center[0], center[1], center[2] - (oh - fw) / 2), (ow, fd, fw))
    _spawn_cube('FLATIRON_FRAME_LEFT', (center[0] - (ow - fw) / 2, center[1], center[2]), (fw, fd, oh - 2 * fw))
    _spawn_cube('FLATIRON_FRAME_RIGHT', (center[0] + (ow - fw) / 2, center[1], center[2]), (fw, fd, oh - 2 * fw))

    unreal.log('Flatiron frame geometry created. Assign T_Flatiron_Building to FLATIRON_ART_BACKING on Saturday.')


build()
