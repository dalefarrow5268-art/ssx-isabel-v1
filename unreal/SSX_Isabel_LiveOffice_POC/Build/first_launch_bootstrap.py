"""First-launch bootstrap for the Isabel Live Office POC.

Run this inside Unreal Editor after opening the project. It validates the project,
rebuilds the office blockout, creates navigation/test actors, and leaves the level
ready for the first human/MetaHuman integration pass.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parent


def run_script(filename: str):
    path = ROOT / filename
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_folder(path: str) -> None:
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def actor_by_label(label: str):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == label:
            return actor
    return None


def ensure_navmesh_bounds():
    existing = actor_by_label('ISABEL_NAV_BOUNDS')
    if existing:
        return existing
    nav = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.NavMeshBoundsVolume,
        unreal.Vector(0, 0, 100),
        unreal.Rotator(0, 0, 0),
    )
    nav.set_actor_label('ISABEL_NAV_BOUNDS')
    # Large enough to cover the POC room. Final sizing is tuned visually Saturday.
    nav.set_actor_scale3d(unreal.Vector(8.0, 9.0, 3.0))
    return nav


def ensure_character_placeholder():
    existing = actor_by_label('ISABEL_CHARACTER_PLACEHOLDER')
    if existing:
        return existing
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(185, 115, 0),
        unreal.Rotator(0, 180, 0),
    )
    actor.set_actor_label('ISABEL_CHARACTER_PLACEHOLDER')
    actor.tags = list(actor.tags) + [unreal.Name('ISABEL_CHARACTER_SLOT')]
    return actor


def ensure_test_focus_target():
    existing = actor_by_label('USER_FOCUS_RUNTIME')
    if existing:
        return existing
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(0, 610, 165),
        unreal.Rotator(0, 0, 0),
    )
    actor.set_actor_label('USER_FOCUS_RUNTIME')
    return actor


def validate_core_actors():
    required = [
        'OFFICE_FLOOR', 'BACK_WALL', 'RIGHT_WALL', 'CAMERA_ARRIVAL',
        'SCREEN_01', 'SCREEN_02', 'SCREEN_03', 'SCREEN_04',
        'ISABEL_DESK_SEATED', 'ISABEL_DESK_STAND',
        'SCREEN_01_VIEW', 'SCREEN_02_VIEW', 'SCREEN_03_VIEW', 'SCREEN_04_VIEW',
    ]
    missing = [label for label in required if not actor_by_label(label)]
    if missing:
        raise RuntimeError(f"First-launch validation failed. Missing actors: {missing}")
    return required


def main():
    unreal.log('=== ISABEL LIVE OFFICE: FIRST LAUNCH BOOTSTRAP ===')
    ensure_folder('/Game/Maps')
    ensure_folder('/Game/Isabel')
    ensure_folder('/Game/Isabel/Characters')
    ensure_folder('/Game/Isabel/Screens')
    ensure_folder('/Game/Isabel/Runtime')

    # Validate specification before touching the level.
    anchors = run_script('anchor_registry.py')
    anchors.validate_spec(ROOT / 'office_spec.json')

    # Rebuild deterministic geometry and named anchors.
    run_script('build_live_office.py')

    ensure_navmesh_bounds()
    ensure_character_placeholder()
    ensure_test_focus_target()
    validate_core_actors()

    unreal.log('First-launch bootstrap passed.')
    unreal.log('NEXT: Save level as /Game/Maps/Isabel_LiveOffice_POC')
    unreal.log('NEXT: Replace ISABEL_CHARACTER_PLACEHOLDER with the approved Isabel character.')
    unreal.log('NEXT: Build navigation and run runtime smoke test.')


main()
