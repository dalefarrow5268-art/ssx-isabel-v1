"""Validate the generated Isabel GLB inside Blender.

Run:
  blender --background --python tools/validate-isabel-glb.py -- path/to/isabel-v1.glb

The hard gate is a usable full-body humanoid rig. Facial/eye requirements are
reported separately so the first body build can succeed while we progressively
add the full real-time digital-human contract used by the browser runtime.
"""
from __future__ import annotations

import sys
from pathlib import Path

import bpy


def normalize(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


ARKIT_52 = {
    "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
    "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawRight",
    "jawOpen", "mouthClose", "mouthFunnel", "mouthPucker", "mouthLeft",
    "mouthRight", "mouthSmileLeft", "mouthSmileRight", "mouthFrownLeft",
    "mouthFrownRight", "mouthDimpleLeft", "mouthDimpleRight",
    "mouthStretchLeft", "mouthStretchRight", "mouthRollLower",
    "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper",
    "mouthPressLeft", "mouthPressRight", "mouthLowerDownLeft",
    "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight",
    "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft",
    "browOuterUpRight", "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "noseSneerLeft", "noseSneerRight", "tongueOut",
}

OCULUS_15 = {
    "viseme_sil", "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD",
    "viseme_kk", "viseme_CH", "viseme_SS", "viseme_nn", "viseme_RR",
    "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U",
}


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

    normalized_bones = {
        normalize(b.name): b.name for armature in armatures for b in armature.data.bones
    }
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
        if not any(any(alias in name for alias in role_aliases) for name in normalized_bones):
            missing.append(role)
    if missing:
        raise RuntimeError("Required humanoid bones missing: " + ", ".join(missing))

    eye_aliases = {
        "leftEye": ("lefteye", "eyel", "lEye"),
        "rightEye": ("righteye", "eyer", "rEye"),
    }
    missing_eyes = [
        role
        for role, role_aliases in eye_aliases.items()
        if not any(any(normalize(alias) in bone for alias in role_aliases) for bone in normalized_bones)
    ]

    shape_keys: set[str] = set()
    for mesh in meshes:
        if mesh.data.shape_keys:
            shape_keys.update(block.name for block in mesh.data.shape_keys.key_blocks)

    normalized_shapes = {normalize(name): name for name in shape_keys}
    arkit_found = {name for name in ARKIT_52 if normalize(name) in normalized_shapes}
    viseme_found = {name for name in OCULUS_15 if normalize(name) in normalized_shapes}

    print(f"ISABEL_VALIDATE_OK file={glb}")
    print(
        f"meshes={len(meshes)} armatures={len(armatures)} bones={len(normalized_bones)} "
        f"shape_keys={len(shape_keys)} size={glb.stat().st_size}"
    )
    print(f"ISABEL_BODY_CONTRACT humanoid=PASS armature_names={[a.name for a in armatures]}")
    print(
        "ISABEL_FACE_CONTRACT "
        f"eye_bones={'PASS' if not missing_eyes else 'PENDING:' + ','.join(missing_eyes)} "
        f"arkit={len(arkit_found)}/52 visemes={len(viseme_found)}/15"
    )


if __name__ == "__main__":
    main()
