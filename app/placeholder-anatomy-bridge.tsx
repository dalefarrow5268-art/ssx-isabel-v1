"use client";

import { useEffect } from "react";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

const HUMAN_BASE_URL = "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let activeState: MotionState = "working";
    let stateListener: ((event: Event) => void) | null = null;

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

        let gltf;
        try {
          gltf = await new GLTFLoader().loadAsync(HUMAN_BASE_URL);
        } catch (error) {
          console.error("Humanoid base failed to load", error);
          return;
        }
        if (disposed) return;

        const avatar = gltf.scene;
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
        const scale = initialSize.y > 0 ? targetHeight / initialSize.y : 1;
        avatar.scale.setScalar(scale);

        // Imported humanoid faces the opposite local forward axis from the office rig.
        // Normalize it once here so all existing room choreography stays correct.
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
          hips,
          leftUpperLeg,
          rightUpperLeg,
          leftLowerLeg,
          rightLowerLeg,
          leftUpperArm,
          rightUpperArm,
          leftForeArm,
          rightForeArm,
        ].filter(Boolean) as import("three").Bone[];

        const baseRotations = new Map(tracked.map((bone) => [bone, bone.rotation.clone()]));
        const baseHipY = hips?.position.y ?? 0;
        const approach = (current: number, target: number, speed: number) => current + (target - current) * speed;

        stateListener = (event: Event) => {
          const detail = (event as CustomEvent<MotionState | { state?: MotionState }>).detail;
          activeState = typeof detail === "string" ? detail : detail?.state ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        const animate = () => {
          if (disposed) return;
          const t = performance.now() * 0.001;
          const seated = activeState === "working" || activeState === "notice" || activeState === "sit";
          const walking = activeState === "walk" || activeState === "return";
          const stride = Math.sin(t * 6.2);

          const setX = (bone: import("three").Bone | null, offset: number, speed = 0.12) => {
            if (!bone) return;
            const base = baseRotations.get(bone)?.x ?? 0;
            bone.rotation.x = approach(bone.rotation.x, base + offset, speed);
          };
          const setZ = (bone: import("three").Bone | null, offset: number, speed = 0.12) => {
            if (!bone) return;
            const base = baseRotations.get(bone)?.z ?? 0;
            bone.rotation.z = approach(bone.rotation.z, base + offset, speed);
          };

          if (seated) {
            setX(leftUpperLeg, -1.05, 0.16);
            setX(rightUpperLeg, -1.05, 0.16);
            setX(leftLowerLeg, 1.28, 0.16);
            setX(rightLowerLeg, 1.28, 0.16);
            setX(leftUpperArm, -0.12);
            setX(rightUpperArm, -0.10);
            setX(leftForeArm, -0.38);
            setX(rightForeArm, -0.34);
            if (hips) hips.position.y = approach(hips.position.y, baseHipY - 0.10, 0.12);
          } else if (walking) {
            setX(leftUpperLeg, -stride * 0.38, 0.22);
            setX(rightUpperLeg, stride * 0.38, 0.22);
            setX(leftLowerLeg, Math.max(0, stride) * 0.30, 0.22);
            setX(rightLowerLeg, Math.max(0, -stride) * 0.30, 0.22);
            setX(leftUpperArm, stride * 0.25, 0.22);
            setX(rightUpperArm, -stride * 0.25, 0.22);
            setX(leftForeArm, -0.10, 0.18);
            setX(rightForeArm, -0.10, 0.18);
            if (hips) hips.position.y = approach(hips.position.y, baseHipY + Math.abs(stride) * 0.01, 0.18);
          } else {
            setX(leftUpperLeg, 0);
            setX(rightUpperLeg, 0);
            setX(leftLowerLeg, 0);
            setX(rightLowerLeg, 0);
            setX(leftUpperArm, activeState === "present" ? -0.18 : -0.04);
            setX(rightUpperArm, activeState === "present" ? -0.08 : -0.03);
            setX(leftForeArm, activeState === "present" ? -0.42 : -0.08);
            setX(rightForeArm, activeState === "present" ? -0.20 : -0.07);
            if (hips) hips.position.y = approach(hips.position.y, baseHipY, 0.12);
          }

          setZ(leftUpperArm, activeState === "listen" ? 0.05 : 0.02);
          setZ(rightUpperArm, activeState === "listen" ? -0.05 : -0.02);
          human.rotation.z = Math.sin(t * 0.48) * (activeState === "listen" ? 0.004 : 0.0015);

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
        if (frame) window.cancelAnimationFrame(frame);
        if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
      };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (stateListener) window.removeEventListener("isabel-three-state", stateListener);
    };
  }, []);

  return null;
}
