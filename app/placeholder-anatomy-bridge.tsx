"use client";

import { useEffect } from "react";
import { HumanoidAnimationController } from "./three/humanoid-controller";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

const HUMAN_BASE_URL = "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY";
const MOTION_SOURCE_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let activeState: MotionState = "working";
    let stateListener: ((event: Event) => void) | null = null;
    let controller: HumanoidAnimationController | null = null;

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

        const bones: import("three").Bone[] = [];
        avatar.traverse((object) => {
          if ((object as import("three").Bone).isBone) bones.push(object as import("three").Bone);
        });
        const findBone = (...patterns: string[]) =>
          bones.find((bone) => {
            const name = normalize(bone.name);
            return patterns.some((pattern) => name.includes(pattern));
          }) ?? null;

        const hips = findBone("hips");
        const leftUpperLeg = findBone("leftupperleg", "leftupleg", "leftthigh");
        const rightUpperLeg = findBone("rightupperleg", "rightupleg", "rightthigh");
        const leftLowerLeg = findBone("leftlowerleg", "leftleg", "leftshin");
        const rightLowerLeg = findBone("rightlowerleg", "rightleg", "rightshin");
        const leftUpperArm = findBone("leftupperarm", "leftarm");
        const rightUpperArm = findBone("rightupperarm", "rightarm");
        const leftForeArm = findBone("leftforearm", "leftlowerarm");
        const rightForeArm = findBone("rightforearm", "rightlowerarm");

        const tracked = [
          hips, leftUpperLeg, rightUpperLeg, leftLowerLeg, rightLowerLeg,
          leftUpperArm, rightUpperArm, leftForeArm, rightForeArm,
        ].filter(Boolean) as import("three").Bone[];
        const baseRotations = new Map(tracked.map((bone) => [bone, bone.rotation.clone()]));
        const baseHipY = hips?.position.y ?? 0;
        const approach = (current: number, target: number, speed: number) => current + (target - current) * speed;

        try {
          controller = new HumanoidAnimationController(avatar);
          const idleClip = motionGltf.animations.find((clip) => normalize(clip.name) === "idle");
          const walkClip = motionGltf.animations.find((clip) => normalize(clip.name) === "walk");
          if (!idleClip || !walkClip) throw new Error("Motion source is missing Idle or Walk clips");
          controller.registerRetargeted({ name: "idle", clip: idleClip, sourceRoot: motionGltf.scene }, true);
          controller.registerRetargeted({ name: "walk", clip: walkClip, sourceRoot: motionGltf.scene }, true);
          controller.play("idle", 0, true);
        } catch (error) {
          controller?.dispose();
          controller = null;
          console.error("Retargeted humanoid animation setup failed", error);
        }

        stateListener = (event: Event) => {
          const detail = (event as CustomEvent<MotionState | { state?: MotionState }>).detail;
          activeState = typeof detail === "string" ? detail : detail?.state ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        let previousTime = performance.now();
        let activeMotion: "idle" | "walk" | "sit" = "idle";

        const setManualX = (bone: import("three").Bone | null, offset: number, speed = 0.15) => {
          if (!bone) return;
          const base = baseRotations.get(bone)?.x ?? 0;
          bone.rotation.x = approach(bone.rotation.x, base + offset, speed);
        };

        const animate = () => {
          if (disposed) return;
          const now = performance.now();
          const delta = Math.min((now - previousTime) / 1000, 0.05);
          previousTime = now;
          const seated = activeState === "working" || activeState === "notice" || activeState === "sit";
          const walking = activeState === "walk" || activeState === "return";

          if (seated) {
            if (activeMotion !== "sit") {
              controller?.stop(0.12);
              activeMotion = "sit";
            }
            setManualX(leftUpperLeg, -1.05, 0.17);
            setManualX(rightUpperLeg, -1.05, 0.17);
            setManualX(leftLowerLeg, 1.28, 0.17);
            setManualX(rightLowerLeg, 1.28, 0.17);
            setManualX(leftUpperArm, -0.12, 0.14);
            setManualX(rightUpperArm, -0.10, 0.14);
            setManualX(leftForeArm, -0.38, 0.14);
            setManualX(rightForeArm, -0.34, 0.14);
            if (hips) hips.position.y = approach(hips.position.y, baseHipY - 0.10, 0.14);
          } else {
            const desired: "idle" | "walk" = walking ? "walk" : "idle";
            if (activeMotion !== desired) {
              controller?.play(desired, 0.26, desired === "walk");
              activeMotion = desired;
            }
            controller?.update(delta);
            if (hips && !controller) hips.position.y = approach(hips.position.y, baseHipY, 0.12);
          }

          human.rotation.z = Math.sin(now * 0.00048) * (activeState === "listen" ? 0.004 : 0.0015);
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
        controller?.dispose();
        controller = null;
        if (frame) window.cancelAnimationFrame(frame);
        if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
      };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
      controller?.dispose();
      controller = null;
      if (frame) window.cancelAnimationFrame(frame);
      if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
    };
  }, []);

  return null;
}
