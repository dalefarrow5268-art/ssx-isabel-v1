"""Runtime-facing adapter for Isabel's persistent Unreal character.

This file defines the contract between the behavior executor and the actual
MetaHuman/compatible character that will be instantiated on the home AI PC.
It deliberately avoids hard-coding a specific generated MetaHuman asset path
until the locked Isabel likeness passes visual acceptance.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

try:
    import unreal
except Exception:  # permits non-Unreal inspection/tests
    unreal = None


@dataclass
class CharacterBindings:
    actor_label: str = "ISABEL_CHARACTER"
    body_mesh_component: Optional[Any] = None
    face_component: Optional[Any] = None
    anim_instance: Optional[Any] = None
    ai_controller: Optional[Any] = None


class IsabelCharacterAdapter:
    def __init__(self, bindings: CharacterBindings | None = None):
        self.bindings = bindings or CharacterBindings()
        self.current_posture = "SEATED"
        self.current_attention = "SCREEN_02"

    def resolve_actor(self):
        if unreal is None:
            return None
        actors = unreal.EditorLevelLibrary.get_all_level_actors()
        for actor in actors:
            if actor.get_actor_label() == self.bindings.actor_label:
                return actor
        return None

    def bind(self):
        actor = self.resolve_actor()
        if actor is None:
            return {"ok": False, "reason": "ISABEL_CHARACTER actor not yet present"}
        self.bindings.ai_controller = getattr(actor, "controller", None)
        return {"ok": True, "actor": actor.get_actor_label()}

    def set_posture(self, posture: str):
        self.current_posture = posture
        return {"ok": True, "posture": posture}

    def set_attention(self, target: str):
        self.current_attention = target
        return {"ok": True, "attention": target}

    def play_named_action(self, action: str):
        # Saturday: map action names to accepted animation assets / montages.
        # We keep the semantic contract stable even while assets change.
        return {"ok": True, "action": action, "binding": "pending_asset_mapping"}

    def look_at(self, world_target):
        # Saturday: bind to Control Rig / MetaHuman gaze controls.
        return {"ok": True, "look_target": world_target}

    def point_at(self, world_target):
        # Saturday: drive upper-body montage + hand IK toward the gesture target.
        return {"ok": True, "gesture_target": world_target}

    def speak(self, audio_source: str, facial_source: str = "audio_driven"):
        # Future runtime hook: audio playback and facial animation stay coupled.
        return {
            "ok": True,
            "audio_source": audio_source,
            "facial_source": facial_source,
            "identity": "ISABEL_V1",
        }


if __name__ == "__main__":
    adapter = IsabelCharacterAdapter()
    print(adapter.set_attention("USER"))
    print(adapter.play_named_action("LOOK_AT_USER"))
