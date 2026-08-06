"""Validate the generated Isabel GLB inside Blender.

Run:
  blender --background --python tools/validate-isabel-glb.py -- path/to/isabel-v1.glb
"""
from __future__ import annotations

import sys
from pathlib import Path

import bpy


def normalize(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def main() -> None:
    argv = sys.argv
    args = argv[argv.index("--") + 1 :] if "--" in argv else []
    if not args:
        raise RuntimeError("GLB path is required")

    glb = Path(args[0]).resolve()
    if not glb.exists() or glb.stat().st_size < 100_000:
        raise RuntimeError(f"GLB missing or implausibly small: {glb}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(glb))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if not meshes:
        raise RuntimeError("No mesh found in Isabel GLB")
    if not armatures:
        raise RuntimeError("No armature found in Isabel GLB")

    bone_names = {normalize(b.name): b.name for armature in armatures for b in armature.data.bones}
    aliases = {
        "hips": ("hips", "pelvis", "hip"),
        "spine": ("spine",),
        "chest": ("chest", "upperchest", "spine2", "spine02"),
        "neck": ("neck",),
        "head": ("head",),
        "leftupperarm": ("leftupperarm", "upperarml", "leftarm"),
        "leftlowerarm": ("leftforearm", "leftlowerarm", "lowerarml"),
        "lefthand": ("lefthand", "handl"),
        "rightupperarm": ("rightupperarm", "upperarmr", "rightarm"),
        "rightlowerarm": ("rightforearm", "rightlowerarm", "lowerarmr"),
        "righthand": ("righthand", "handr"),
        "leftupperleg": ("leftupperleg", "leftthigh", "uplegl"),
        "leftlowerleg": ("leftlowerleg", "leftshin", "legl"),
        "leftfoot": ("leftfoot", "footl"),
        "rightupperleg": ("rightupperleg", "rightthigh", "uplegr"),
        "rightlowerleg": ("rightlowerleg", "rightshin", "legr"),
        "rightfoot": ("rightfoot", "footr"),
    }

    missing: list[str] = []
    for role, role_aliases in aliases.items():
        if not any(any(alias in name for alias in role_aliases) for name in bone_names):
            missing.append(role)
    if missing:
        raise RuntimeError("Required humanoid bones missing: " + ", ".join(missing))

    shape_keys = set()
    for mesh in meshes:
        if mesh.data.shape_keys:
            shape_keys.update(block.name for block in mesh.data.shape_keys.key_blocks)

    print(f"ISABEL_VALIDATE_OK file={glb}")
    print(f"meshes={len(meshes)} armatures={len(armatures)} bones={len(bone_names)} shape_keys={len(shape_keys)} size={glb.stat().st_size}")


if __name__ == "__main__":
    main()
