import json
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / 'tray_ceiling_spec.json').read_text(encoding='utf-8'))
OFFICE = json.loads((ROOT / 'office_spec.json').read_text(encoding='utf-8'))
TAG = unreal.Name('ISABEL_TRAY_CEILING')
ELL = unreal.EditorLevelLibrary
CUBE = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')


def add_tag(actor):
    tags = list(actor.tags)
    tags.append(TAG)
    actor.tags = tags


def cube(label, loc, size):
    actor = ELL.spawn_actor_from_object(CUBE, unreal.Vector(*loc), unreal.Rotator(0, 0, 0))
    actor.set_actor_label(label)
    actor.set_actor_scale3d(unreal.Vector(size[0] / 100.0, size[1] / 100.0, size[2] / 100.0))
    add_tag(actor)
    return actor


def destroy_previous():
    for actor in ELL.get_all_level_actors():
        if TAG in actor.tags:
            ELL.destroy_actor(actor)


def build_geometry():
    room = OFFICE['room']
    ceiling = SPEC['ceiling']
    w, d, h = room['width'], room['depth'], room['height']
    inset = ceiling['tray_inset_cm']
    drop = ceiling['tray_drop_cm']
    band = ceiling['perimeter_band_width_cm']

    # Central raised plane and lower perimeter frame are separate for clean edges/material control.
    cube('TRAY_CENTER', (0, 0, h - 2), (w - 2 * inset, d - 2 * inset, 4))

    z = h - drop / 2
    cube('TRAY_EDGE_FRONT', (0, d / 2 - band / 2, z), (w, band, drop))
    cube('TRAY_EDGE_BACK', (0, -d / 2 + band / 2, z), (w, band, drop))
    cube('TRAY_EDGE_LEFT', (-w / 2 + band / 2, 0, z), (band, d - 2 * band, drop))
    cube('TRAY_EDGE_RIGHT', (w / 2 - band / 2, 0, z), (band, d - 2 * band, drop))


def rect_light(label, loc, rot, width, height, intensity):
    actor = ELL.spawn_actor_from_class(unreal.RectLight, unreal.Vector(*loc), unreal.Rotator(*rot))
    actor.set_actor_label(label)
    add_tag(actor)
    comp = actor.rect_light_component
    for prop, value in [('source_width', width), ('source_height', height), ('intensity', intensity), ('temperature', SPEC['lighting']['color_temperature_k'])]:
        try:
            comp.set_editor_property(prop, value)
        except Exception:
            pass
    try:
        comp.set_editor_property('use_temperature', True)
    except Exception:
        pass
    return actor


def build_lighting():
    room = OFFICE['room']
    ceiling = SPEC['ceiling']
    w, d, h = room['width'], room['depth'], room['height']
    inset = ceiling['tray_inset_cm']
    z = h - ceiling['tray_drop_cm'] + 4
    intensity = 2500.0

    # Hidden inward-facing perimeter lights approximate cove lighting for the POC.
    rect_light('TRAY_LIGHT_FRONT', (0, d / 2 - inset, z), (0, 0, 180), w - 2 * inset, 10, intensity)
    rect_light('TRAY_LIGHT_BACK', (0, -d / 2 + inset, z), (0, 0, 0), w - 2 * inset, 10, intensity)
    rect_light('TRAY_LIGHT_LEFT', (-w / 2 + inset, 0, z), (0, 0, -90), d - 2 * inset, 10, intensity)
    rect_light('TRAY_LIGHT_RIGHT', (w / 2 - inset, 0, z), (0, 0, 90), d - 2 * inset, 10, intensity)


def main():
    unreal.log('=== ISABEL LIVE OFFICE: building tray ceiling ===')
    destroy_previous()
    build_geometry()
    build_lighting()
    unreal.log('Tray ceiling and perimeter lighting guides created.')
    unreal.log('Tune intensities on the home GPU after CAMERA_ARRIVAL review; do not change geometry to solve exposure.')


main()
