import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'floor_foreground_spec.json').read_text(encoding='utf-8'))
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')
TAG = unreal.Name('ISABEL_FLOOR_GUIDE')


def spawn_cube(label, loc, size):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*loc))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(unreal.Vector(size[0] / 100.0, size[1] / 100.0, size[2] / 100.0))
    actor.tags = list(actor.tags) + [TAG]
    return actor


def clear_previous():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def main():
    clear_previous()

    # Human-scale guest-chair proxies only. Final assets replace these guides without
    # changing CAMERA_ARRIVAL or Isabel's locked desk/navigation anchors.
    spawn_cube('GUEST_CHAIR_LEFT_GUIDE', (-145, 315, 43), (66, 72, 86))
    spawn_cube('GUEST_CHAIR_RIGHT_GUIDE', (145, 315, 43), (66, 72, 86))

    # A thin floor-depth guide marks the protected visible carpet foreground band.
    spawn_cube('FOREGROUND_CARPET_BAND_GUIDE', (0, 340, 1), (560, 120, 2))

    unreal.log('ISABEL: floor/foreground scale guides created. Review from CAMERA_ARRIVAL before asset replacement.')


main()
