"use client";

import { useEffect } from "react";
import type { IsabelViseme } from "./text-viseme";
import { IsabelFacialPerformanceController } from "./three/facial-performance-controller";
import { HumanoidAnimationController } from "./three/humanoid-controller";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";
type VisemeCueDetail = {
  shape: IsabelViseme;
  strength?: number;
  durationMs?: number;
};

const HUMAN_BASE_URL = "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY";
const MOTION_SOURCE_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
const VISEME_CUE_EVENT = "isabel-viseme-cue";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let activeState: MotionState = "working";
    let stateListener: ((event: Event) => void) | null = null;
    let visemeListener: ((event: Event) => void) | null = null;
    let controller: HumanoidAnimationController | null = null;
    let facialController: IsabelFacialPerformanceController | null = null;

    void (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;

      const proto = THREE.Object3D.prototype;
      const originalAdd = proto.add;
      const pending = new WeakSet<import("three").Object3D>();
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

      const enhanceRig = async (rig: import("three").Object3D) => {
        if (disposed || rig.getObjectByName("REAL_HUMANOID_BASE")) return;

        let avatarGltf;
        let motionGltf;
        try {
          [avatarGltf, motionGltf] = await Promise.all([
            new GLTFLoader().loadAsync(HUMAN_BASE_URL),
            new GLTFLoader().loadAsync(MOTION_SOURCE_URL),
          ]);
        } catch (error) {
          console.error("Humanoid or motion source failed to load", error);
          return;
        }
        if (disposed) return;

        const avatar = avatarGltf.scene;
        avatar.name = "REAL_HUMANOID_AVATAR";
        avatar.traverse((object) => {
          if ((object as import("three").Mesh).isMesh) {
            const mesh = object as import("three").Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        const initialBox = new THREE.Box3().setFromObject(avatar);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const targetHeight = 4.15;
        avatar.scale.setScalar(initialSize.y > 0 ? targetHeight / initialSize.y : 1);
        avatar.rotation.y = Math.PI;

        const fittedBox = new THREE.Box3().setFromObject(avatar);
        const center = fittedBox.getCenter(new THREE.Vector3());
        avatar.position.x -= center.x;
        avatar.position.z -= center.z;
        avatar.position.y -= fittedBox.min.y;

        const human = new THREE.Group();
        human.name = "REAL_HUMANOID_BASE";
        human.add(avatar);

        for (const child of rig.children) child.visible = false;
        originalAdd.call(rig, human);
        human.visible = true;

        try {
          controller = new HumanoidAnimationController(avatar);

          const clipsByName = new Map(
            motionGltf.animations.map((clip) => [normalize(clip.name), clip] as const),
          );
          const requireClip = (...names: string[]) => {
            for (const name of names) {
              const clip = clipsByName.get(normalize(name));
              if (clip) return clip;
            }
            throw new Error(`Motion source is missing clip: ${names.join(" / ")}`);
          };

          controller.registerRetargeted(
            { name: "idle", clip: requireClip("Idle"), sourceRoot: motionGltf.scene },
            true,
          );
          controller.registerRetargeted(
            { name: "walk", clip: requireClip("Walking", "Walk"), sourceRoot: motionGltf.scene },
            true,
          );
          controller.registerRetargeted(
            { name: "sit", clip: requireClip("Sitting", "Sit"), sourceRoot: motionGltf.scene },
            true,
          );
          controller.registerRetargeted(
            { name: "stand", clip: requireClip("Standing", "Stand"), sourceRoot: motionGltf.scene },
            true,
          );
          controller.registerRetargeted(
            { name: "present", clip: requireClip("Wave"), sourceRoot: motionGltf.scene },
            false,
          );

          controller.play("sit", 0, true);
        } catch (error) {
          controller?.dispose();
          controller = null;
          console.error("Retargeted humanoid animation setup failed", error);
        }

        // Facial performance is a separate layer from the body mixer. The existing
        // speech runtime emits coarse viseme cues; this adapter resolves them to the
        // MPFB/TalkingHead-compatible morph names available on the loaded GLB.
        facialController = new IsabelFacialPerformanceController(avatar);
        visemeListener = (event: Event) => {
          const detail = (event as CustomEvent<VisemeCueDetail>).detail;
          if (!detail?.shape) return;
          facialController?.setViseme(detail);
        };
        window.addEventListener(VISEME_CUE_EVENT, visemeListener);

        stateListener = (event: Event) => {
          const detail = (event as CustomEvent<MotionState | { state?: MotionState }>).detail;
          activeState = typeof detail === "string" ? detail : detail?.state ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        const targetWorld = new THREE.Vector3();
        const linkWorld = new THREE.Vector3();
        const effectorWorld = new THREE.Vector3();
        const linkWorldQ = new THREE.Quaternion();
        const inverseLinkQ = new THREE.Quaternion();
        const effectorVector = new THREE.Vector3();
        const targetVector = new THREE.Vector3();
        const axis = new THREE.Vector3();
        const deltaQ = new THREE.Quaternion();
        const leftFootWorld = new THREE.Vector3();
        const rightFootWorld = new THREE.Vector3();

        const solveArmToward = (
          target: import("three").Vector3,
          effector: import("three").Bone | undefined,
          links: Array<import("three").Bone | undefined>,
          strength: number,
        ) => {
          if (!effector || links.some((link) => !link)) return;
          targetWorld.copy(target);
          avatar.updateMatrixWorld(true);

          for (let iteration = 0; iteration < 4; iteration += 1) {
            for (const maybeLink of links) {
              const link = maybeLink!;
              link.getWorldPosition(linkWorld);
              link.getWorldQuaternion(linkWorldQ);
              effector.getWorldPosition(effectorWorld);

              inverseLinkQ.copy(linkWorldQ).invert();
              effectorVector.subVectors(effectorWorld, linkWorld).applyQuaternion(inverseLinkQ).normalize();
              targetVector.subVectors(targetWorld, linkWorld).applyQuaternion(inverseLinkQ).normalize();

              const dot = THREE.MathUtils.clamp(effectorVector.dot(targetVector), -1, 1);
              let angle = Math.acos(dot);
              if (!Number.isFinite(angle) || angle < 0.0001) continue;
              angle = Math.min(angle, 0.22) * strength;

              axis.crossVectors(effectorVector, targetVector);
              if (axis.lengthSq() < 0.000001) continue;
              axis.normalize();
              deltaQ.setFromAxisAngle(axis, angle);
              link.quaternion.multiply(deltaQ).normalize();
              link.updateMatrixWorld(true);
            }
          }
        };

        const stabilizeFeetToFloor = (strength: number) => {
          const leftFoot = controller?.report.bones.leftFoot;
          const rightFoot = controller?.report.bones.rightFoot;
          if (!leftFoot || !rightFoot || strength <= 0) return;
          avatar.updateMatrixWorld(true);
          leftFoot.getWorldPosition(leftFootWorld);
          rightFoot.getWorldPosition(rightFootWorld);
          const lowestFoot = Math.min(leftFootWorld.y, rightFootWorld.y);
          const correction = THREE.MathUtils.clamp(-lowestFoot, -0.08, 0.08) * strength;
          human.position.y += correction;
        };

        let previousTime = performance.now();
        let activeMotion: "idle" | "walk" | "sit" | "stand" | "present" = "sit";

        const animate = () => {
          if (disposed) return;
          const now = performance.now();
          const delta = Math.min((now - previousTime) / 1000, 0.05);
          previousTime = now;

          const seated = activeState === "working" || activeState === "notice" || activeState === "sit";
          const walking = activeState === "walk" || activeState === "return";
          const explicitlyStanding = activeState === "stand";
          const presenting = activeState === "present";

          const desired: "idle" | "walk" | "sit" | "stand" | "present" = seated
            ? "sit"
            : walking
              ? "walk"
              : explicitlyStanding
                ? "stand"
                : presenting
                  ? "present"
                  : "idle";

          if (activeMotion !== desired) {
            const fade = desired === "walk" ? 0.22 : desired === "present" ? 0.18 : 0.30;
            controller?.play(desired, fade, true);
            activeMotion = desired;
          }

          controller?.update(delta);
          facialController?.update(delta, now);

          if (presenting && controller) {
            const report = controller.report;
            const gestureTarget = new THREE.Vector3(-3.15, 3.15, -2.25);
            solveArmToward(
              gestureTarget,
              report.bones.rightHand,
              [report.bones.rightLowerArm, report.bones.rightUpperArm],
              0.32,
            );
          }

          if (!seated) stabilizeFeetToFloor(walking ? 0.18 : 0.34);

          human.rotation.z = Math.sin(now * 0.00048) * (activeState === "listen" ? 0.003 : 0.0012);
          frame = window.requestAnimationFrame(animate);
        };
        frame = window.requestAnimationFrame(animate);
      };

      proto.add = function patchedAdd(...objects: import("three").Object3D[]) {
        const result = originalAdd.apply(this, objects);
        for (const object of objects) {
          if (object.name === "PROCEDURAL_PLACEHOLDER_NOT_ISABEL" && !pending.has(object)) {
            pending.add(object);
            queueMicrotask(() => {
              pending.delete(object);
              void enhanceRig(object);
            });
          }
        }
        return result;
      };

      const restore = () => {
        proto.add = originalAdd;
        facialController?.reset();
        facialController = null;
        controller?.dispose();
        controller = null;
        if (frame) window.cancelAnimationFrame(frame);
        if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
        if (visemeListener) window.removeEventListener(VISEME_CUE_EVENT, visemeListener);
      };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
      facialController?.reset();
      facialController = null;
      controller?.dispose();
      controller = null;
      if (frame) window.cancelAnimationFrame(frame);
      if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
      if (visemeListener) window.removeEventListener(VISEME_CUE_EVENT, visemeListener);
    };
  }, []);

  return null;
}
