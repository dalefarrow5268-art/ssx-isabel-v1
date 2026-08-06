"""Build Isabel from a versioned MPFB spec and export a GLB.

Run inside Blender with MPFB installed:
  blender --background --python tools/build-isabel-mpfb.py -- \
    --spec tools/isabel-character-spec.json \
    --output public/models/isabel/isabel-v1.glb

The script intentionally uses MPFB's documented HumanService deserialization path so
Isabel can be regenerated deterministically instead of hand-modeled each iteration.
"""

from __future__ import annotations

import argparse
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


def ensure_mpfb() -> None:
    try:
        bpy.ops.preferences.addon_enable(module="mpfb")
    except Exception:
        pass
    try:
        import mpfb  # noqa: F401
    except ImportError as exc:
        raise RuntimeError("MPFB must be installed/enabled in Blender before building Isabel") from exc


def scan_assets(root: Path, kind: str) -> list[tuple[str, str]]:
    folder = root / ("skins" if kind == "skin" else kind)
    if not folder.exists():
        return []
    ext = ".mhmat" if kind == "skin" else ".mhclo"
    found: list[tuple[str, str]] = []
    for path in folder.rglob(f"*{ext}"):
        try:
            fragment = str(path.relative_to(folder)).replace("\\", "/")
        except ValueError:
            continue
        found.append((path.stem.lower(), fragment))
    return found


def resolve_asset(root: Path, kind: str, keywords: list[str]) -> str | None:
    candidates = scan_assets(root, kind)
    if not candidates:
        return None
    keys = [k.lower() for k in keywords]
    scored = []
    for name, fragment in candidates:
        haystack = f"{name} {fragment.lower()}"
        score = sum(1 for key in keys if key in haystack)
        scored.append((score, fragment))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return scored[0][1] if scored and scored[0][0] > 0 else None


def build_human_info(spec: dict, data_root: Path) -> dict:
    search = spec.get("asset_search", {})
    info = {
        "name": spec.get("name", "Isabel"),
        "phenotype": spec["phenotype"],
        "rig": spec.get("rig", "game_engine"),
        "targets": [],
        "clothes": [],
        "alternative_materials": {},
        "skin_material_type": "GAMEENGINE",
    }

    for part in ("hair", "eyes", "eyebrows", "eyelashes"):
        fragment = resolve_asset(data_root, part, search.get(part, []))
        if fragment:
            info[part] = fragment

    skin = resolve_asset(data_root, "skin", search.get("skin", []))
    if skin:
        info["skin_mhmat"] = skin

    for part in ("top", "bottom", "shoes"):
        fragment = resolve_asset(data_root, "clothes", search.get(part, []))
        if fragment and fragment not in info["clothes"]:
            info["clothes"].append(fragment)

    return info


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    common = dict(
        filepath=str(output),
        export_format="GLB",
        export_apply=True,
        export_animations=True,
        export_skins=True,
    )
    try:
        bpy.ops.export_scene.gltf(**common, export_morph=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**common)


def main() -> None:
    args = parse_args()
    spec_path = Path(args.spec).resolve()
    output_path = Path(args.output).resolve()
    spec = json.loads(spec_path.read_text(encoding="utf-8"))

    ensure_mpfb()
    from mpfb.services.humanservice import HumanService
    from mpfb.services.locationservice import LocationService

    data_root = Path(args.mpfb_data).expanduser().resolve() if args.mpfb_data else None
    if data_root and data_root.exists():
        LocationService.set_user_data_override(str(data_root))
    elif data_root:
        raise RuntimeError(f"MPFB data path does not exist: {data_root}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    if data_root is None:
        raise RuntimeError(
            "Set MPFB_DATA_PATH or pass --mpfb-data so the builder can resolve skin, hair and wardrobe assets"
        )

    human_info = build_human_info(spec, data_root)
    settings = HumanService.get_default_deserialization_settings()
    settings.update(
        {
            "mask_helpers": True,
            "detailed_helpers": True,
            "extra_vertex_groups": True,
            "feet_on_ground": True,
            "scale": 0.1,
            "subdiv_levels": 1,
            "load_clothes": True,
            "material_instances": "GAMEENGINE",
        }
    )

    basemesh = HumanService.deserialize_from_dict(human_info, settings)
    basemesh.name = "ISABEL_BASEMESH"
    basemesh["ssx_character_spec"] = spec.get("schema", "")
    basemesh["ssx_character_name"] = spec.get("name", "Isabel")

    if args.save_blend:
        blend_path = Path(args.save_blend).resolve()
        blend_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    export_glb(output_path)
    print(f"ISABEL_BUILD_OK {output_path}")


if __name__ == "__main__":
    main()
