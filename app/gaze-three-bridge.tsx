"use client";

import { useEffect } from "react";

type HeadPose = {
  yaw: number;
  pitch: number;
  intensity: number;
};

const HEAD_POSE_EVENT = "isabel-head-pose";
const PLACEHOLDER_RIG = "PROCEDURAL_PLACEHOLDER_NOT_ISABEL";
const PLACEHOLDER_HEAD = "PLACEHOLDER_HEAD_PIVOT";

export default function IsabelGazeThreeBridge() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let headTarget: import("three").Object3D | null = null;
    let neutralYaw = 0;
    let neutralPitch = 0;
    let latestPose: HeadPose = { yaw: 0, pitch: 0, intensity: 1 };

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const objectPrototype = THREE.Object3D.prototype;
      const originalAdd = objectPrototype.add;
      const pendingScans = new WeakSet<import("three").Object3D>();

      const bindHead = (candidate: import("three").Object3D | null | undefined) => {
        if (!candidate || disposed || headTarget === candidate) return false;
        headTarget = candidate;
        neutralYaw = candidate.rotation.y;
        neutralPitch = candidate.rotation.x;
        return true;
      };

      const normalizedName = (object: import("three").Object3D) =>
        object.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      const findNamedHead = (root: import("three").Object3D) => {
        let exact: import("three").Object3D | null = null;
        let fallback: import("three").Object3D | null = null;

        root.traverse((object) => {
          if (exact) return;
          if (object.name === PLACEHOLDER_HEAD) {
            exact = object;
            return;
          }

          const name = normalizedName(object);
          if (!fallback && (name === "head" || name === "headpivot" || name.endsWith("head"))) {
            fallback = object;
          }
        });

        return exact ?? fallback;
      };

      const scanRig = (rig: import("three").Object3D) => {
        if (disposed || headTarget) return;
        bindHead(findNamedHead(rig));
      };

      const scheduleScan = (rig: import("three").Object3D) => {
        if (disposed || headTarget || pendingScans.has(rig)) return;
        pendingScans.add(rig);
        queueMicrotask(() => {
          pendingScans.delete(rig);
          scanRig(rig);
          if (!headTarget) {
            window.requestAnimationFrame(() => scanRig(rig));
          }
        });
      };

      objectPrototype.add = function patchedAdd(...objects: import("three").Object3D[]) {
        const result = originalAdd.apply(this, objects);

        if (this.name === PLACEHOLDER_RIG) {
          scheduleScan(this);
        }

        for (const object of objects) {
          if (object.name === PLACEHOLDER_HEAD) {
            bindHead(object);
            break;
          }

          if (object.name === PLACEHOLDER_RIG) {
            scheduleScan(object);
          }

          if (!headTarget) {
            const name = normalizedName(object);
            if (name === "head" || name === "headpivot" || name.endsWith("head")) {
              bindHead(object);
            }
          }
        }

        return result;
      };

      const poseListener = (event: Event) => {
        const detail = (event as CustomEvent<HeadPose>).detail;
        if (!detail) return;
        latestPose = {
          yaw: Number.isFinite(detail.yaw) ? detail.yaw : latestPose.yaw,
          pitch: Number.isFinite(detail.pitch) ? detail.pitch : latestPose.pitch,
          intensity: Number.isFinite(detail.intensity) ? detail.intensity : latestPose.intensity,
        };
      };

      const applyPose = () => {
        if (disposed) return;

        if (headTarget) {
          const strength = THREE.MathUtils.clamp(latestPose.intensity ?? 1, 0, 1);
          const yaw = THREE.MathUtils.clamp(latestPose.yaw ?? 0, -0.62, 0.62);
          const pitch = THREE.MathUtils.clamp(latestPose.pitch ?? 0, -0.34, 0.30);
          const targetYaw = neutralYaw + yaw * strength;
          const targetPitch = neutralPitch + pitch * strength;

          headTarget.rotation.y = THREE.MathUtils.lerp(headTarget.rotation.y, targetYaw, 0.13);
          headTarget.rotation.x = THREE.MathUtils.lerp(headTarget.rotation.x, targetPitch, 0.13);
          headTarget.rotation.z = THREE.MathUtils.lerp(headTarget.rotation.z, -yaw * 0.035 * strength, 0.08);
        }

        frame = window.requestAnimationFrame(applyPose);
      };

      window.addEventListener(HEAD_POSE_EVENT, poseListener);
      frame = window.requestAnimationFrame(applyPose);

      const restore = () => {
        objectPrototype.add = originalAdd;
        window.removeEventListener(HEAD_POSE_EVENT, poseListener);
        if (frame) window.cancelAnimationFrame(frame);
      };

      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
