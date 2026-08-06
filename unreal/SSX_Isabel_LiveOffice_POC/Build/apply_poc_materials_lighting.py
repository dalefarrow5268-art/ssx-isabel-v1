"""Apply deterministic POC materials/lighting labels and tuning hooks.

This script is intentionally conservative: it creates/labels the lighting actors and
material assignment targets we need for Saturday without pretending final production
materials exist before we inspect the room on the real GPU.
"""

import json
import os
import unreal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_PATH = os.path.join(ROOT, 'Build', 'office_materials_lighting_spec.json')

with open(SPEC_PATH, 'r', encoding='utf-8') as f:
    SPEC = json.load(f)

ELL = unreal.EditorLevelLibrary
TAG = unreal.Name('ISABEL_POC')


def actors_by_label():
    return {a.get_actor_label(): a for a in ELL.get_all_level_actors()}


def ensure_light(label, cls, location, rotation=None):
    actors = actors_by_label()
    if label in actors:
        return actors[label]
    rot = rotation or unreal.Rotator(0, 0, 0)
    actor = ELL.spawn_actor_from_class(cls, unreal.Vector(*location), rot)
    actor.set_actor_label(label)
    actor.tags = list(actor.tags) + [TAG]
    return actor


def setup_lighting():
    daylight = ensure_light(
        'SUN_DAYLIGHT', unreal.DirectionalLight, (0, 0, 250), unreal.Rotator(-35, -35, 0)
    )
    try:
        daylight.directional_light_component.set_editor_property('intensity', 4.0)
        daylight.directional_light_component.set_editor_property('temperature', SPEC['lighting']['daylight']['color_temperature_k'])
        daylight.directional_light_component.set_editor_property('use_temperature', True)
    except Exception as exc:
        unreal.log_warning(f'Daylight tuning incomplete: {exc}')

    sky = ensure_light('SKYLIGHT', unreal.SkyLight, (0, 0, 200))
    try:
        sky.light_component.set_editor_property('intensity', 1.0)
    except Exception as exc:
        unreal.log_warning(f'Skylight tuning incomplete: {exc}')

    # Four soft rect lights approximate the tray/perimeter effect for POC review.
    tray = [
        ('TRAY_LIGHT_N', (0, -250, 315), (0, 0, 0)),
        ('TRAY_LIGHT_S', (0, 250, 315), (0, 180, 0)),
        ('TRAY_LIGHT_W', (-260, 0, 315), (0, 90, 0)),
        ('TRAY_LIGHT_E', (260, 0, 315), (0, -90, 0)),
    ]
    for label, loc, rot in tray:
        light = ensure_light(label, unreal.RectLight, loc, unreal.Rotator(*rot))
        try:
            comp = light.rect_light_component
            comp.set_editor_property('intensity', 650.0)
            comp.set_editor_property('temperature', SPEC['lighting']['ceiling_perimeter']['color_temperature_k'])
            comp.set_editor_property('use_temperature', True)
            comp.set_editor_property('source_width', 180.0)
            comp.set_editor_property('source_height', 25.0)
        except Exception as exc:
            unreal.log_warning(f'{label} tuning incomplete: {exc}')

    desk = ensure_light('DESK_LAMP_POC', unreal.PointLight, (150, 95, 125))
    try:
        desk.point_light_component.set_editor_property('intensity', 450.0)
        desk.point_light_component.set_editor_property('attenuation_radius', 230.0)
        desk.point_light_component.set_editor_property('temperature', SPEC['lighting']['desk_lamp']['color_temperature_k'])
        desk.point_light_component.set_editor_property('use_temperature', True)
    except Exception as exc:
        unreal.log_warning(f'Desk lamp tuning incomplete: {exc}')


def validate_material_targets():
    labels = set(actors_by_label())
    required = {
        'OFFICE_FLOOR', 'OFFICE_CEILING', 'BACK_WALL', 'RIGHT_WALL',
        'MONITOR_WHITE_REVEAL', 'SCREEN_01', 'SCREEN_02', 'SCREEN_03', 'SCREEN_04',
        'DESK_TOP'
    }
    missing = sorted(required - labels)
    if missing:
        unreal.log_warning(f'Material target actors missing: {missing}')
    else:
        unreal.log('All POC material target actors are present.')


def main():
    unreal.log('=== ISABEL LIVE OFFICE: applying POC lighting/material hooks ===')
    setup_lighting()
    validate_material_targets()
    unreal.log('Material families are locked by office_materials_lighting_spec.json.')
    unreal.log('Final texture assets will be selected only after real GPU/camera review.')
    unreal.log('=== ISABEL LIVE OFFICE: POC lighting/material pass complete ===')


main()
