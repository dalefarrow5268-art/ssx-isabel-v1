"use client";

import { useEffect } from "react";
import { HumanoidAnimationController } from "./three/humanoid-controller";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

const HUMAN_BASE_URL = "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY";
const MOTION_SOURCE_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";

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

          controller.play("sit", 0, true);
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
        let activeMotion: "idle" | "walk" | "sit" | "stand" = "sit";

        const animate = () => {
          if (disposed) return;
          const now = performance.now();
          const delta = Math.min((now - previousTime) / 1000, 0.05);
          previousTime = now;

          const seated = activeState === "working" || activeState === "notice" || activeState === "sit";
          const walking = activeState === "walk" || activeState === "return";
          const explicitlyStanding = activeState === "stand";

          const desired: "idle" | "walk" | "sit" | "stand" = seated
            ? "sit"
            : walking
              ? "walk"
              : explicitlyStanding
                ? "stand"
                : "idle";

          if (activeMotion !== desired) {
            controller?.play(desired, desired === "walk" ? 0.22 : 0.30, true);
            activeMotion = desired;
          }

          controller?.update(delta);
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
