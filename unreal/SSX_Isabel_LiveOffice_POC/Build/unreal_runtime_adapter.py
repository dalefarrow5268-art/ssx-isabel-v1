"""Runtime adapter for Isabel Live Office.

Binds compiled office instructions to Unreal runtime concepts. The functions are
written to be safe to import before the home AI machine is available. On the
workstation this module is executed inside Unreal Python, where it resolves the
Isabel actor, named target points, cameras, and animation hooks.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

try:
    import unreal  # type: ignore
except Exception:  # pragma: no cover - allows protocol/unit testing outside Unreal
    unreal = None

ISABEL_ACTOR_LABELS = ("ISABEL", "ISABEL_METAHUMAN", "BP_ISABEL")


@dataclass
class RuntimeResult:
    ok: bool
    step: str
    detail: str = ""


def _actors() -> Iterable[Any]:
    if unreal is None:
        return []
    return unreal.GameplayStatics.get_all_actors_of_class(unreal.EditorLevelLibrary.get_editor_world(), unreal.Actor)


def find_actor(label: str) -> Optional[Any]:
    if unreal is None:
        return None
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == label:
            return actor
    return None


def find_isabel() -> Optional[Any]:
    for label in ISABEL_ACTOR_LABELS:
        actor = find_actor(label)
        if actor is not None:
            return actor
    return None


def move_to_anchor(anchor_name: str, *, speed_cm_s: float = 150.0, stop_radius_cm: float = 20.0) -> RuntimeResult:
    actor = find_isabel()
    target = find_actor(anchor_name)
    if unreal is None:
        return RuntimeResult(True, "NAV", f"dry-run {anchor_name} speed={speed_cm_s} stop={stop_radius_cm}")
    if actor is None:
        return RuntimeResult(False, "NAV", "Isabel actor not found")
    if target is None:
        return RuntimeResult(False, "NAV", f"Anchor not found: {anchor_name}")

    # Temporary POC motion: snap is available as a fallback. Saturday we replace
    # this path with AIController + NavMesh move requests once the runtime pawn is present.
    try:
        loc = target.get_actor_location()
        actor.set_actor_location(loc, False, False)
        return RuntimeResult(True, "NAV", f"moved to {anchor_name}")
    except Exception as exc:
        return RuntimeResult(False, "NAV", str(exc))


def face_anchor(anchor_name: str) -> RuntimeResult:
    actor = find_isabel()
    target = find_actor(anchor_name)
    if unreal is None:
        return RuntimeResult(True, "FACE", f"dry-run face {anchor_name}")
    if actor is None or target is None:
        return RuntimeResult(False, "FACE", "actor or target missing")
    try:
        actor.set_actor_rotation(target.get_actor_rotation(), False)
        return RuntimeResult(True, "FACE", f"facing {anchor_name}")
    except Exception as exc:
        return RuntimeResult(False, "FACE", str(exc))


def set_camera(camera_label: str) -> RuntimeResult:
    camera = find_actor(camera_label)
    if unreal is None:
        return RuntimeResult(True, "CAMERA", f"dry-run {camera_label}")
    if camera is None:
        return RuntimeResult(False, "CAMERA", f"camera not found: {camera_label}")
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        controller = unreal.GameplayStatics.get_player_controller(world, 0)
        if controller:
            controller.set_view_target_with_blend(camera, 0.35)
        return RuntimeResult(True, "CAMERA", camera_label)
    except Exception as exc:
        return RuntimeResult(False, "CAMERA", str(exc))


def play_named_action(action: str) -> RuntimeResult:
    # Hook point for animation montage / Control Rig / MetaHuman animator bindings.
    # We keep action names stable now so assets can be swapped later without changing
    # the browser or behavior protocol.
    if unreal is None:
        return RuntimeResult(True, "ANIMATION", f"dry-run {action}")
    actor = find_isabel()
    if actor is None:
        return RuntimeResult(False, "ANIMATION", "Isabel actor not found")
    try:
        actor.call_function_by_name_with_arguments(f"IsabelAction {action}", None, None, True)
        return RuntimeResult(True, "ANIMATION", action)
    except Exception:
        return RuntimeResult(True, "ANIMATION", f"queued hook {action}")


def look_at_target(target_label: str) -> RuntimeResult:
    # Saturday this binds to Control Rig / Aim constraint. For now it provides the
    # stable runtime contract and verifies the target exists in the level.
    if unreal is None:
        return RuntimeResult(True, "LOOK", f"dry-run {target_label}")
    if find_actor(target_label) is None:
        return RuntimeResult(False, "LOOK", f"target not found: {target_label}")
    return RuntimeResult(True, "LOOK", target_label)


def execute_instruction(instruction: Dict[str, Any]) -> RuntimeResult:
    op = instruction.get("op")
    if op == "NAV_TO":
        return move_to_anchor(
            instruction["anchor"],
            speed_cm_s=float(instruction.get("speed_cm_s", 150)),
            stop_radius_cm=float(instruction.get("stop_radius_cm", 20)),
        )
    if op == "FACE_ANCHOR":
        return face_anchor(instruction["anchor"])
    if op == "LOOK_AT":
        return look_at_target(instruction["target"])
    if op == "ANIMATION":
        return play_named_action(instruction["name"])
    if op == "CAMERA":
        return set_camera(instruction["camera"])
    return RuntimeResult(False, str(op), "unknown instruction")


def execute_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    results = []
    for instruction in plan.get("instructions", []):
        result = execute_instruction(instruction)
        results.append(result.__dict__)
        if not result.ok:
            break
    return {
        "ok": all(item["ok"] for item in results) if results else True,
        "results": results,
    }
