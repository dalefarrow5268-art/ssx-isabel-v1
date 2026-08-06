"""Build Isabel with MPFB's current standalone scripting API and export a browser GLB.

Run inside Blender with MPFB installed:
  blender --background --python tools/build-isabel-mpfb.py -- \
    --spec tools/isabel-character-spec.json \
    --output public/models/isabel/isabel-v1.glb \
    --save-blend build/isabel/isabel-v1.blend

This follows MPFB's official script_samples complete-character export pattern:
create_human -> skin/assets -> built-in rig -> ExportService staging -> GLB export.
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--mpfb-data", default=os.environ.get("MPFB_DATA_PATH", ""))
    parser.add_argument("--save-blend", default="")
    return parser.parse_args(argv)


def dynamic_import(package_suffix: str, key: str):
    """Resolve MPFB services when installed as a Blender Extension.

    MPFB's own standalone examples use this pattern because extension modules live
    below a runtime-generated package prefix rather than being importable as plain
    top-level ``mpfb`` modules.
    """
    for module_name in tuple(sys.modules):
        if module_name.endswith(package_suffix):
            module = importlib.import_module(module_name)
            if not hasattr(module, key):
                raise AttributeError(f"Module {module_name} has no {key}")
            return getattr(module, key)
    raise RuntimeError(f"MPFB service not loaded: {package_suffix}.{key}")


def ensure_mpfb_loaded() -> None:
    """Force Blender to initialize installed extensions before resolving services."""
    # A no-op background scene load is sufficient after the extension has been installed.
    # The extension registration occurs during Blender startup; inspect loaded modules rather
    # than assuming the legacy top-level addon name is importable.
    if not any("mpfb" in name.lower() for name in sys.modules):
        raise RuntimeError("MPFB extension is installed but was not loaded by Blender")


def scan_assets(root: Path, kind: str, extension: str) -> list[Path]:
    folder = root / kind
    if not folder.exists():
        return []
    return sorted(folder.rglob(f"*{extension}"))


def resolve_asset(root: Path, kind: str, keywords: list[str], extension: str = ".mhclo") -> Path | None:
    candidates = scan_assets(root, kind, extension)
    if not candidates:
        return None
    keys = [key.lower() for key in keywords]
    scored: list[tuple[int, str, Path]] = []
    for path in candidates:
        haystack = f"{path.stem} {path.as_posix()}".lower()
        score = sum(1 for key in keys if key in haystack)
        scored.append((score, path.as_posix(), path))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return scored[0][2] if scored and scored[0][0] > 0 else None


def choose_default(root: Path, kind: str, filenames: tuple[str, ...]) -> Path | None:
    for filename in filenames:
        matches = sorted((root / kind).rglob(filename)) if (root / kind).exists() else []
        if matches:
            return matches[0]
    return None


def add_asset(HumanService, basemesh, path: Path | None, asset_type: str) -> None:
    if path is None:
        print(f"ISABEL_ASSET_SKIP type={asset_type}")
        return
    print(f"ISABEL_ASSET_ADD type={asset_type} file={path}")
    HumanService.add_mhclo_asset(str(path), basemesh, asset_type=asset_type, material_type="GAMEENGINE")


def select_hierarchy(ObjectService, root) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in ObjectService.get_list_of_children(root):
        child.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    kwargs = dict(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=True,
        export_skins=True,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_morph=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def main() -> None:
    args = parse_args()
    spec = json.loads(Path(args.spec).resolve().read_text(encoding="utf-8"))
    data_root = Path(args.mpfb_data).expanduser().resolve() if args.mpfb_data else None
    output_path = Path(args.output).resolve()

    if data_root is None or not data_root.exists():
        raise RuntimeError("Set MPFB_DATA_PATH or pass --mpfb-data with MakeHuman system assets")

    ensure_mpfb_loaded()
    HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
    ExportService = dynamic_import("mpfb.services.exportservice", "ExportService")
    ObjectService = dynamic_import("mpfb.services.objectservice", "ObjectService")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    # Official MPFB standalone API: start with a real basemesh, then attach the game rig.
    basemesh = HumanService.create_human()
    basemesh.name = "ISABEL_BASEMESH"
    basemesh["ssx_character_spec"] = spec.get("schema", "")
    basemesh["ssx_character_name"] = spec.get("name", "Isabel")

    search = spec.get("asset_search", {})

    skin = resolve_asset(data_root, "skins", search.get("skin", []), extension=".mhmat")
    if skin is None:
        skin = choose_default(data_root, "skins", ("young_caucasian_female.mhmat",))
    if skin:
        print(f"ISABEL_SKIN file={skin}")
        HumanService.set_character_skin(str(skin), basemesh, skin_type="GAMEENGINE")

    # game_engine is MPFB's browser/game-friendly built-in skeleton and matches our
    # Three.js humanoid retargeting contract better than a Blender control rig.
    rig_name = spec.get("rig", "game_engine")
    HumanService.add_builtin_rig(basemesh, rig_name)
    print(f"ISABEL_RIG name={rig_name}")

    defaults = {
        "eyes": ("low-poly.mhclo",),
        "eyebrows": ("eyebrow001.mhclo",),
        "eyelashes": ("eyelashes01.mhclo",),
        "tongue": ("tongue01.mhclo",),
        "teeth": ("teeth_base.mhclo",),
    }
    type_names = {
        "eyes": "Eyes",
        "eyebrows": "Eyebrows",
        "eyelashes": "Eyelashes",
        "tongue": "Tongue",
        "teeth": "Teeth",
        "hair": "Hair",
    }
    for kind in ("eyes", "eyebrows", "eyelashes", "tongue", "teeth", "hair"):
        asset = resolve_asset(data_root, kind, search.get(kind, []))
        if asset is None and kind in defaults:
            asset = choose_default(data_root, kind, defaults[kind])
        add_asset(HumanService, basemesh, asset, type_names[kind])

    # Wardrobe is selected independently so the black professional silhouette can be
    # refined without changing the body/rig contract.
    for slot in ("top", "bottom", "shoes"):
        garment = resolve_asset(data_root, "clothes", search.get(slot, []))
        add_asset(HumanService, basemesh, garment, "Clothes")

    if args.save_blend:
        blend_path = Path(args.save_blend).resolve()
        blend_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    # Official MPFB export staging: duplicate the full character hierarchy, bake
    # modifiers/masks and remove helper geometry before handing it to glTF.
    export_root = ExportService.create_character_copy(basemesh, name_suffix="_export")
    export_basemesh = ObjectService.find_object_of_type_amongst_nearest_relatives(export_root, "Basemesh")
    if export_basemesh is None:
        raise RuntimeError("MPFB export staging did not produce a Basemesh")

    ExportService.bake_modifiers_remove_helpers(
        export_basemesh,
        bake_masks=True,
        bake_subdiv=True,
        remove_helpers=True,
        also_proxy=True,
    )
    select_hierarchy(ObjectService, export_root)
    export_glb(output_path)

    if not output_path.exists() or output_path.stat().st_size < 100_000:
        raise RuntimeError(f"GLB export failed or is implausibly small: {output_path}")
    print(f"ISABEL_BUILD_OK file={output_path} size={output_path.stat().st_size}")


if __name__ == "__main__":
    main()
