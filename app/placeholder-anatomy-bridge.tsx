"use client";

import { useEffect } from "react";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let activeState: MotionState = "working";

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const proto = THREE.Object3D.prototype;
      const originalAdd = proto.add;
      const pending = new WeakSet<import("three").Object3D>();

      const enhanceRig = (rig: import("three").Object3D) => {
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V11")) return;

        const headPivot = rig.children.find(
          (child) =>
            (child as import("three").Group).isGroup &&
            child.position.y > 3.5 &&
            child.position.y < 4.2 &&
            child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.62 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.67 });
        const blouse = new THREE.MeshStandardMaterial({ color: 0x040508, roughness: 0.74 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x21120e, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x040508, roughness: 0.44 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        headPivot.scale.setScalar(0.64);
        headPivot.position.set(0, 4.43, 0.07);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V11";
        originalAdd.call(rig, human);

        const torso = new THREE.Group();
        torso.name = "TORSO_ROOT";
        human.add(torso);

        const pelvis = new THREE.Group();
        pelvis.name = "PELVIS_ROOT";
        human.add(pelvis);

        const mesh = (
          parent: import("three").Object3D,
          geometry: import("three").BufferGeometry,
          material: import("three").Material,
          name: string,
          x: number,
          y: number,
          z: number,
          sx = 1,
          sy = 1,
          sz = 1,
        ) => {
          const m = new THREE.Mesh(geometry, material);
          m.name = name;
          m.position.set(x, y, z);
          m.scale.set(sx, sy, sz);
          m.castShadow = true;
          parent.add(m);
          return m;
        };

        mesh(torso, new THREE.CylinderGeometry(0.115, 0.155, 0.34, 24), skin, "NECK", 0, 4.10, 0, 1, 1, 0.9);

        const clavicle = mesh(torso, new THREE.CapsuleGeometry(0.055, 0.52, 6, 16), suit, "CLAVICLE", 0, 3.90, 0, 1, 1, 0.9);
        clavicle.rotation.z = Math.PI / 2;

        mesh(torso, new THREE.CylinderGeometry(0.46, 0.42, 0.34, 32), suit, "CHEST", 0, 3.72, 0.01, 1, 1, 0.56);
        mesh(torso, new THREE.CylinderGeometry(0.42, 0.38, 0.38, 32), suit, "RIBCAGE", 0, 3.37, 0.015, 1, 1, 0.57);
        mesh(torso, new THREE.CylinderGeometry(0.38, 0.395, 0.38, 32), suit, "WAIST", 0, 3.00, 0.018, 1, 1, 0.58);
        mesh(torso, new THREE.CylinderGeometry(0.395, 0.43, 0.31, 32), suit, "BLAZER_HEM", 0, 2.66, 0.02, 1, 1, 0.59);

        mesh(pelvis, new THREE.CylinderGeometry(0.43, 0.48, 0.30, 32), suitSoft, "PELVIS_TOP", 0, 2.39, 0.02, 1.02, 1, 0.61);
        mesh(pelvis, new THREE.CylinderGeometry(0.48, 0.42, 0.26, 32), suitSoft, "PELVIS_BOTTOM", 0, 2.12, 0.02, 1, 1, 0.60);
        mesh(pelvis, new THREE.SphereGeometry(0.15, 18, 12), suitSoft, "HIP_L", -0.37, 2.22, 0.02, 1, 1.15, 0.58);
        mesh(pelvis, new THREE.SphereGeometry(0.15, 18, 12), suitSoft, "HIP_R", 0.37, 2.22, 0.02, 1, 1.15, 0.58);

        mesh(torso, new THREE.PlaneGeometry(0.15, 0.46), blouse, "BLOUSE", 0, 3.53, 0.294);
        const lapelL = mesh(torso, new THREE.BoxGeometry(0.09, 0.38, 0.018), suitSoft, "LAPEL_L", -0.10, 3.53, 0.292);
        lapelL.rotation.z = -0.24;
        const lapelR = mesh(torso, new THREE.BoxGeometry(0.09, 0.38, 0.018), suitSoft, "LAPEL_R", 0.10, 3.53, 0.292);
        lapelR.rotation.z = 0.24;

        const shoulders: import("three").Group[] = [];
        const elbows: import("three").Group[] = [];
        const hips: import("three").Group[] = [];
        const knees: import("three").Group[] = [];

        const makeArm = (side: -1 | 1) => {
          const shoulder = new THREE.Group();
          shoulder.name = side < 0 ? "SHOULDER_L" : "SHOULDER_R";
          shoulder.position.set(side * 0.39, 3.76, 0.01);
          human.add(shoulder);
          shoulders.push(shoulder);

          const sleeve = mesh(shoulder, new THREE.CapsuleGeometry(0.054, 0.15, 6, 12), suit, `SLEEVE_CAP_${side}`, side * 0.01, -0.08, 0, 1.08, 1, 0.9);
          sleeve.rotation.z = Math.PI / 2 + side * -0.26;

          const upper = mesh(shoulder, new THREE.CapsuleGeometry(0.072, 0.60, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.02, -0.48, 0.025, 0.95, 1, 0.88);
          upper.rotation.z = side * -0.045;
          upper.rotation.x = -0.06;

          const elbow = new THREE.Group();
          elbow.name = side < 0 ? "ELBOW_L" : "ELBOW_R";
          elbow.position.set(side * 0.035, -0.91, 0.045);
          shoulder.add(elbow);
          elbows.push(elbow);

          mesh(elbow, new THREE.SphereGeometry(0.058, 14, 10), suit, `ELBOW_JOINT_${side}`, 0, 0, 0, 0.78, 0.58, 0.78);
          const fore = mesh(elbow, new THREE.CapsuleGeometry(0.059, 0.55, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.012, -0.38, 0.045, 0.92, 1, 0.86);
          fore.rotation.z = side * -0.02;
          fore.rotation.x = -0.08;
          mesh(elbow, new THREE.CylinderGeometry(0.046, 0.054, 0.13, 14), skin, `WRIST_${side}`, side * 0.018, -0.71, 0.068, 1, 1, 0.86);
          const hand = mesh(elbow, new THREE.CapsuleGeometry(0.069, 0.225, 5, 10), skin, `HAND_${side}`, side * 0.022, -0.92, 0.08, 0.86, 1, 0.56);
          hand.rotation.z = side * -0.012;
        };
        makeArm(-1);
        makeArm(1);

        const makeLeg = (side: -1 | 1) => {
          const hip = new THREE.Group();
          hip.name = side < 0 ? "HIP_JOINT_L" : "HIP_JOINT_R";
          hip.position.set(side * 0.20, 2.06, 0.015);
          human.add(hip);
          hips.push(hip);

          mesh(hip, new THREE.CylinderGeometry(0.16, 0.145, 0.28, 20), suitSoft, `THIGH_ROOT_${side}`, 0, -0.13, 0, 1, 1, 0.92);
          const thigh = mesh(hip, new THREE.CapsuleGeometry(0.145, 0.84, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.61, 0, 1, 1, 0.92);
          thigh.rotation.z = side * 0.002;

          const knee = new THREE.Group();
          knee.name = side < 0 ? "KNEE_L" : "KNEE_R";
          knee.position.set(0, -1.15, 0.02);
          hip.add(knee);
          knees.push(knee);

          mesh(knee, new THREE.SphereGeometry(0.094, 14, 10), suitSoft, `KNEE_JOINT_${side}`, 0, 0, 0, 0.82, 0.58, 0.82);
          const calf = mesh(knee, new THREE.CapsuleGeometry(0.122, 0.79, 6, 12), suitSoft, `CALF_${side}`, side * 0.002, -0.43, 0.015, 1.02, 1, 0.90);
          calf.rotation.z = side * -0.002;
          mesh(knee, new THREE.CylinderGeometry(0.078, 0.088, 0.18, 14), suitSoft, `ANKLE_${side}`, side * 0.002, -0.88, 0.03, 1, 1, 0.9);
          const foot = mesh(knee, new THREE.BoxGeometry(0.30, 0.145, 0.64), shoe, `FOOT_${side}`, side * 0.012, -1.04, 0.20);
          foot.rotation.y = side * 0.03;
        };
        makeLeg(-1);
        makeLeg(1);

        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.053, 14, 10), skin);
        earL.scale.set(0.48, 1, 0.42);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.041, 0.126, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.134, 0.014, 0.018), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.045;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.045;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.087, 16, 10), skin);
        chin.scale.set(1.08, 0.43, 0.60);
        chin.position.set(0, -0.34, 0.34);
        headPivot.add(chin);

        const stateListener = (event: Event) => {
          const detail = (event as CustomEvent<MotionState | { state?: MotionState }>).detail;
          activeState = typeof detail === "string" ? detail : detail?.state ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        const baseHeadY = headPivot.position.y;
        let compensation = 0;

        const animate = () => {
          if (disposed) return;
          const t = performance.now() * 0.001;
          const walking = activeState === "walk" || activeState === "return";
          const listening = activeState === "listen";
          const presenting = activeState === "present";
          const lowered = activeState === "working" || activeState === "notice" || activeState === "sit";

          const targetComp = lowered ? 0.72 : 0;
          compensation += (targetComp - compensation) * 0.16;
          human.position.y = compensation;
          headPivot.position.y = baseHeadY + compensation + Math.sin(t * 1.45) * 0.003;

          const breath = Math.sin(t * 1.45);
          torso.scale.y = 1 + breath * 0.0025;
          torso.scale.x = 1 + breath * 0.001;
          const sway = Math.sin(t * 0.48);
          human.position.x = sway * (walking ? 0.0015 : 0.004);
          human.rotation.z = sway * (listening ? 0.0035 : 0.0015);

          const torsoZ = listening ? -0.008 + sway * 0.0015 : presenting ? 0.006 : sway * 0.001;
          const torsoX = presenting ? -0.016 : activeState === "notice" ? -0.004 : 0;
          torso.rotation.z += (torsoZ - torso.rotation.z) * 0.1;
          torso.rotation.x += (torsoX - torso.rotation.x) * 0.1;
          pelvis.rotation.z += ((-torsoZ * 0.3) - pelvis.rotation.z) * 0.1;

          if (walking) {
            const stride = Math.sin(t * 6.6);
            shoulders[0].rotation.x = stride * 0.13;
            shoulders[1].rotation.x = -stride * 0.13;
            elbows[0].rotation.x = -0.12 - Math.max(0, -stride) * 0.05;
            elbows[1].rotation.x = -0.12 - Math.max(0, stride) * 0.05;
            hips[0].rotation.x = -stride * 0.10;
            hips[1].rotation.x = stride * 0.10;
            knees[0].rotation.x = Math.max(0, stride) * 0.14;
            knees[1].rotation.x = Math.max(0, -stride) * 0.14;
          } else {
            shoulders[0].rotation.x += ((listening ? -0.025 : -0.038) - shoulders[0].rotation.x) * 0.1;
            shoulders[1].rotation.x += ((listening ? -0.018 : -0.028) - shoulders[1].rotation.x) * 0.1;
            elbows[0].rotation.x += ((presenting ? -0.22 : listening ? -0.14 : -0.08) - elbows[0].rotation.x) * 0.1;
            elbows[1].rotation.x += ((presenting ? -0.16 : listening ? -0.10 : -0.07) - elbows[1].rotation.x) * 0.1;
            hips[0].rotation.x += (0 - hips[0].rotation.x) * 0.1;
            hips[1].rotation.x += (0 - hips[1].rotation.x) * 0.1;
            knees[0].rotation.x += (0 - knees[0].rotation.x) * 0.1;
            knees[1].rotation.x += (0 - knees[1].rotation.x) * 0.1;
          }

          shoulders[0].rotation.z += ((listening ? 0.035 : 0.018) - shoulders[0].rotation.z) * 0.1;
          shoulders[1].rotation.z += ((listening ? -0.030 : -0.016) - shoulders[1].rotation.z) * 0.1;
          hips[0].rotation.z += ((listening ? 0.006 : 0.001) - hips[0].rotation.z) * 0.1;
          hips[1].rotation.z += ((listening ? -0.009 : -0.001) - hips[1].rotation.z) * 0.1;

          frame = window.requestAnimationFrame(animate);
        };
        frame = window.requestAnimationFrame(animate);

        window.addEventListener("pagehide", () => window.removeEventListener("isabel-three-state", stateListener), { once: true });
      };

      proto.add = function patchedAdd(...objects: import("three").Object3D[]) {
        const result = originalAdd.apply(this, objects);
        if (this.name === "PROCEDURAL_PLACEHOLDER_NOT_ISABEL" && !pending.has(this)) {
          pending.add(this);
          queueMicrotask(() => {
            pending.delete(this);
            enhanceRig(this);
          });
        }
        return result;
      };

      const restore = () => {
        proto.add = originalAdd;
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
