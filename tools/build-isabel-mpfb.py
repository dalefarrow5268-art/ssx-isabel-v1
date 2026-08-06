"""Build Isabel with MPFB's current standalone scripting API and export a browser GLB.

Run inside Blender with MPFB installed:
  blender --background --python tools/build-isabel-mpfb.py -- \
    --spec tools/isabel-character-spec.json \
    --likeness tools/isabel-likeness-targets.json \
    --output public/models/isabel/isabel-v1.glb \
    --save-blend build/isabel/isabel-v1.blend

Pipeline:
create_human -> approved likeness targets -> skin/assets -> Mixamo-compatible rig ->
browser face targets -> ExportService staging -> GLB export.
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
    parser.add_argument("--likeness", default="")
    parser.add_argument("--output", required=True)
    parser.add_argument("--mpfb-data", default=os.environ.get("MPFB_DATA_PATH", ""))
    parser.add_argument("--save-blend", default="")
    return parser.parse_args(argv)


def dynamic_import(package_suffix: str, key: str):
    """Resolve MPFB services when installed as a Blender Extension."""
    for module_name in tuple(sys.modules):
        if module_name.endswith(package_suffix):
            module = importlib.import_module(module_name)
            if not hasattr(module, key):
                raise AttributeError(f"Module {module_name} has no {key}")
            return getattr(module, key)
    raise RuntimeError(f"MPFB service not loaded: {package_suffix}.{key}")


def ensure_mpfb_loaded() -> None:
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


def resolve_exact_target(data_root: Path, relative_path: str) -> Path:
    """Resolve only an explicitly approved target path; never fuzzy-match identity morphs."""
    candidate = (data_root / relative_path).resolve()
    root = data_root.resolve()
    if root not in candidate.parents:
        raise RuntimeError(f"Likeness target escapes MPFB data root: {relative_path}")
    if not candidate.exists() or candidate.suffix.lower() != ".target":
        raise RuntimeError(f"Approved likeness target does not exist: {relative_path}")
    return candidate


def apply_likeness_targets(TargetService, basemesh, data_root: Path, likeness_path: Path | None) -> None:
    """Apply a versioned, auditable Isabel identity vector using exact MPFB target paths."""
    if likeness_path is None:
        print("ISABEL_LIKENESS status=not-configured")
        return
    if not likeness_path.exists():
        raise RuntimeError(f"Likeness target file does not exist: {likeness_path}")

    payload = json.loads(likeness_path.read_text(encoding="utf-8"))
    bindings = payload.get("bindings", [])
    applied: list[dict] = []
    for entry in bindings:
        if not entry.get("enabled", True):
            continue
        relative_path = str(entry.get("target", "")).strip()
        if not relative_path:
            continue
        weight = float(entry.get("weight", 0.0))
        if not -1.0 <= weight <= 1.0:
            raise RuntimeError(f"Likeness weight outside safe range [-1,1]: {relative_path}={weight}")
        if abs(weight) < 1e-6:
            continue
        target_path = resolve_exact_target(data_root, relative_path)
        target_name = str(entry.get("name") or target_path.stem)
        TargetService.load_target(basemesh, str(target_path), weight, target_name)
        applied.append({"name": target_name, "target": relative_path, "weight": weight})
        print(f"ISABEL_LIKENESS_APPLY name={target_name} weight={weight:.4f} target={relative_path}")

    basemesh["ssx_likeness_schema"] = payload.get("schema", "")
    basemesh["ssx_likeness_revision"] = payload.get("revision", "")
    print(f"ISABEL_LIKENESS status=applied count={len(applied)} revision={payload.get('revision', '')}")


def add_browser_face_contract(FaceService, basemesh) -> None:
    """Load the exact facial target families expected by our browser runtime."""
    before = set()
    if basemesh.data.shape_keys:
        before = {k.name for k in basemesh.data.shape_keys.key_blocks}

    meta_ok = False
    arkit_ok = False
    try:
        FaceService.load_targets(
            basemesh,
            load_microsoft_visemes=False,
            load_meta_visemes=True,
            load_arkit_faceunits=False,
        )
        meta_ok = True
    except Exception as exc:
        print(f"ISABEL_FACE_PACK_MISSING pack=visemes02 error={type(exc).__name__}:{exc}")

    try:
        FaceService.load_targets(
            basemesh,
            load_microsoft_visemes=False,
            load_meta_visemes=False,
            load_arkit_faceunits=True,
        )
        arkit_ok = True
    except Exception as exc:
        print(f"ISABEL_FACE_PACK_MISSING pack=faceunits01 error={type(exc).__name__}:{exc}")

    if meta_ok or arkit_ok:
        FaceService.interpolate_targets(basemesh)

    after = set()
    if basemesh.data.shape_keys:
        after = {k.name for k in basemesh.data.shape_keys.key_blocks}
    added = sorted(after - before)
    print(
        "ISABEL_FACE_CONTRACT "
        f"meta_visemes={'yes' if meta_ok else 'no'} "
        f"arkit_faceunits={'yes' if arkit_ok else 'no'} "
        f"added_shape_keys={len(added)}"
    )


def normalize_browser_root_name() -> None:
    """TalkingHead and our browser loaders are simplest when the skeleton root is Armature."""
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError("No armature exists after MPFB rig creation")
    armatures.sort(key=lambda obj: obj.name)
    armature = armatures[0]
    armature.name = "Armature"
    if armature.data:
        armature.data.name = "Armature"
    print(f"ISABEL_BROWSER_ROOT name={armature.name} bones={len(armature.data.bones)}")


def report_eye_contract() -> None:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    names = {bone.name.lower().replace("_", "") for arm in armatures for bone in arm.data.bones}
    left = any("lefteye" in name or "eye.l" in name for name in names)
    right = any("righteye" in name or "eye.r" in name for name in names)
    print(
        "ISABEL_EYE_CONTRACT "
        f"left_eye_bone={'yes' if left else 'no'} right_eye_bone={'yes' if right else 'no'} "
        "gaze_fallback=arkit-eye-look-morphs"
    )


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
    likeness_path = Path(args.likeness).resolve() if args.likeness else None
    data_root = Path(args.mpfb_data).expanduser().resolve() if args.mpfb_data else None
    output_path = Path(args.output).resolve()

    if data_root is None or not data_root.exists():
        raise RuntimeError("Set MPFB_DATA_PATH or pass --mpfb-data with MakeHuman system assets")

    ensure_mpfb_loaded()
    HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
    ExportService = dynamic_import("mpfb.services.exportservice", "ExportService")
    ObjectService = dynamic_import("mpfb.services.objectservice", "ObjectService")
    FaceService = dynamic_import("mpfb.services.faceservice", "FaceService")
    TargetService = dynamic_import("mpfb.services.targetservice", "TargetService")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    basemesh = HumanService.create_human()
    basemesh.name = "ISABEL_BASEMESH"
    basemesh["ssx_character_spec"] = spec.get("schema", "")
    basemesh["ssx_character_name"] = spec.get("name", "Isabel")

    # Identity comes before rigging and animation. Exact target paths are versioned in a
    # separate file so likeness tuning is reproducible and independently reviewable.
    apply_likeness_targets(TargetService, basemesh, data_root, likeness_path)

    search = spec.get("asset_search", {})
    skin = resolve_asset(data_root, "skins", search.get("skin", []), extension=".mhmat")
    if skin is None:
        skin = choose_default(data_root, "skins", ("young_caucasian_female.mhmat",))
    if skin:
        print(f"ISABEL_SKIN file={skin}")
        HumanService.set_character_skin(str(skin), basemesh, skin_type="GAMEENGINE")

    rig_name = spec.get("rig", "mixamo")
    HumanService.add_builtin_rig(basemesh, rig_name)
    print(f"ISABEL_RIG name={rig_name}")
    normalize_browser_root_name()

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

    for slot in ("top", "bottom", "shoes"):
        garment = resolve_asset(data_root, "clothes", search.get(slot, []))
        add_asset(HumanService, basemesh, garment, "Clothes")

    add_browser_face_contract(FaceService, basemesh)
    report_eye_contract()

    if args.save_blend:
        blend_path = Path(args.save_blend).resolve()
        blend_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

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
