"use client";

import { useEffect } from "react";

type HeadPose = {
  yaw: number;
  pitch: number;
  intensity: number;
};

const HEAD_POSE_EVENT = "isabel-head-pose";

export default function IsabelGazeThreeBridge() {
  useEffect(() => {
    let disposed = false;
    let headTarget: import("three").Object3D | null = null;
    let latestPose: HeadPose = { yaw: 0, pitch: 0, intensity: 1 };

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const objectPrototype = THREE.Object3D.prototype;
      const originalAdd = objectPrototype.add;

      objectPrototype.add = function patchedAdd(...objects: import("three").Object3D[]) {
        const result = originalAdd.apply(this, objects);

        if (this.name === "PROCEDURAL_PLACEHOLDER_NOT_ISABEL") {
          const likelyHead = objects.find((object) =>
            Math.abs(object.position.y - 3.79) < 0.08 && object.children.length >= 3,
          );
          if (likelyHead) headTarget = likelyHead;
        }

        if (!headTarget) {
          for (const object of objects) {
            const normalized = object.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (normalized === "head" || normalized.endsWith("head")) {
              headTarget = object;
              break;
            }
          }
        }

        return result;
      };

      const poseListener = (event: Event) => {
        latestPose = (event as CustomEvent<HeadPose>).detail ?? latestPose;
      };

      const applyPose = () => {
        if (disposed) return;
        if (headTarget) {
          const strength = Math.max(0, Math.min(1, latestPose.intensity ?? 1));
          const targetYaw = (latestPose.yaw ?? 0) * strength;
          const targetPitch = (latestPose.pitch ?? 0) * strength;
          headTarget.rotation.y += (targetYaw - headTarget.rotation.y) * 0.12;
          headTarget.rotation.x += (targetPitch - headTarget.rotation.x) * 0.12;
        }
        window.requestAnimationFrame(applyPose);
      };

      window.addEventListener(HEAD_POSE_EVENT, poseListener);
      window.requestAnimationFrame(applyPose);

      const restore = () => {
        objectPrototype.add = originalAdd;
        window.removeEventListener(HEAD_POSE_EVENT, poseListener);
      };

      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
