"use client";

import { useEffect } from "react";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let idleFrame = 0;
    let activeState: MotionState = "working";

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const objectPrototype = THREE.Object3D.prototype;
      const originalAdd = objectPrototype.add;
      const pending = new WeakSet<import("three").Object3D>();

      const enhanceRig = (rig: import("three").Object3D) => {
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V6")) return;

        const headPivot = rig.children.find((child) =>
          (child as import("three").Group).isGroup && child.position.y > 3.5 && child.position.y < 4.2 && child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.58 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.64 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0xe9e3dc, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.44 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        headPivot.scale.setScalar(0.73);
        headPivot.position.set(0, 4.39, 0.06);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V6";
        originalAdd.call(rig, human);

        const torso = new THREE.Group();
        torso.name = "HUMAN_TORSO_GROUP";
        torso.position.y = 0;
        human.add(torso);

        const pelvisGroup = new THREE.Group();
        pelvisGroup.name = "HUMAN_PELVIS_GROUP";
        human.add(pelvisGroup);

        const addMesh = (
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
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = name;
          mesh.position.set(x, y, z);
          mesh.scale.set(sx, sy, sz);
          parent.add(mesh);
          return mesh;
        };

        addMesh(torso, new THREE.CylinderGeometry(0.14, 0.18, 0.31, 24), skin, "HUMAN_NECK", 0, 4.04, 0, 1, 1, 0.92);
        addMesh(torso, new THREE.CylinderGeometry(0.50, 0.37, 0.82, 28), suit, "CHEST_TAPER", 0, 3.54, 0.015, 1.05, 1, 0.61);
        addMesh(torso, new THREE.CylinderGeometry(0.37, 0.40, 0.45, 28), suitSoft, "WAIST_BRIDGE", 0, 2.92, 0.02, 1.04, 1, 0.62);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.40, 0.46, 0.50, 28), suitSoft, "PELVIS_TAPER", 0, 2.45, 0.02, 1.05, 1, 0.64);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.42, 0.35, 0.28, 28), suitSoft, "LOWER_PELVIS", 0, 2.08, 0.02, 1.02, 1, 0.62);
        addMesh(torso, new THREE.PlaneGeometry(0.20, 0.56), shirt, "SHIRT_PANEL", 0, 3.53, 0.325);

        const armGroups: import("three").Group[] = [];
        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.505;
          const arm = new THREE.Group();
          arm.name = side < 0 ? "ARM_L" : "ARM_R";
          arm.position.set(shoulderX, 3.70, 0.02);
          human.add(arm);
          armGroups.push(arm);

          const shoulderBlend = addMesh(arm, new THREE.CapsuleGeometry(0.085, 0.18, 6, 12), suit, `SHOULDER_BLEND_${side}`, side * 0.02, -0.10, 0.01, 1.08, 1, 0.95);
          shoulderBlend.rotation.z = Math.PI / 2;

          const upper = addMesh(arm, new THREE.CapsuleGeometry(0.088, 0.58, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.065, -0.50, 0.035, 0.98, 1, 0.92);
          upper.rotation.z = side * -0.12;
          upper.rotation.x = -0.045;

          addMesh(arm, new THREE.SphereGeometry(0.080, 14, 10), suit, `ELBOW_${side}`, side * 0.125, -0.91, 0.065, 0.88, 0.70, 0.88);

          const fore = addMesh(arm, new THREE.CapsuleGeometry(0.072, 0.52, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.155, -1.29, 0.115, 0.96, 1, 0.90);
          fore.rotation.z = side * -0.065;
          fore.rotation.x = -0.09;

          addMesh(arm, new THREE.CylinderGeometry(0.058, 0.067, 0.15, 14), skin, `WRIST_${side}`, side * 0.175, -1.60, 0.14, 1, 1, 0.90);
          const hand = addMesh(arm, new THREE.CapsuleGeometry(0.079, 0.22, 5, 10), skin, `HAND_${side}`, side * 0.19, -1.81, 0.155, 0.92, 1, 0.62);
          hand.rotation.z = side * -0.04;
        };
        makeArm(-1);
        makeArm(1);

        const legGroups: import("three").Group[] = [];
        const makeLeg = (side: -1 | 1) => {
          const x = side * 0.22;
          const leg = new THREE.Group();
          leg.name = side < 0 ? "LEG_L" : "LEG_R";
          leg.position.set(x, 2.00, 0.02);
          human.add(leg);
          legGroups.push(leg);

          const thigh = addMesh(leg, new THREE.CapsuleGeometry(0.145, 0.86, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.47, 0, 1.02, 1, 0.95);
          thigh.rotation.z = side * 0.01;
          addMesh(leg, new THREE.SphereGeometry(0.116, 14, 10), suitSoft, `KNEE_${side}`, side * 0.006, -1.02, 0.025, 0.90, 0.68, 0.90);
          const calf = addMesh(leg, new THREE.CapsuleGeometry(0.125, 0.72, 6, 12), suitSoft, `CALF_${side}`, side * 0.012, -1.42, 0.02, 1.0, 1, 0.94);
          calf.rotation.z = side * -0.006;
          addMesh(leg, new THREE.CylinderGeometry(0.082, 0.09, 0.17, 14), suitSoft, `ANKLE_${side}`, side * 0.012, -1.83, 0.035, 1, 1, 0.92);
          const foot = addMesh(leg, new THREE.BoxGeometry(0.30, 0.16, 0.58), shoe, `FOOT_${side}`, side * 0.024, -1.99, 0.17);
          foot.rotation.y = side * 0.055;
        };
        makeLeg(-1);
        makeLeg(1);

        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 10), skin);
        earL.scale.set(0.52, 1, 0.46);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone(); earR.position.x = 0.445; headPivot.add(earR);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.15, 14), skin);
        nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.025, 0.49); headPivot.add(nose);
        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.016, 0.022), hair);
        browL.position.set(-0.17, 0.16, 0.445); browL.rotation.z = -0.06; headPivot.add(browL);
        const browR = browL.clone(); browR.position.x = 0.17; browR.rotation.z = 0.06; headPivot.add(browR);
        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 10), skin);
        chin.scale.set(1.18, 0.50, 0.68); chin.position.set(0, -0.34, 0.34); headPivot.add(chin);

        const stateListener = (event: Event) => {
          activeState = (event as CustomEvent<MotionState>).detail ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        const baseHeadY = headPivot.position.y;
        const animateIdle = () => {
          if (disposed) return;
          const t = performance.now() * 0.001;
          const walking = activeState === "walk" || activeState === "return";
          const listening = activeState === "listen";
          const presenting = activeState === "present";
          const sitting = activeState === "working" || activeState === "sit";

          const breath = Math.sin(t * 1.6);
          torso.scale.y = 1 + breath * 0.004;
          torso.scale.x = 1 + breath * 0.002;
          headPivot.position.y = baseHeadY + breath * 0.005;

          const sway = Math.sin(t * 0.62);
          human.position.x = sway * (walking ? 0.004 : 0.008);
          human.rotation.z = sway * (listening ? 0.007 : 0.0035);
          torso.rotation.z = listening ? -0.018 + sway * 0.004 : presenting ? 0.012 : sway * 0.0025;
          torso.rotation.x = presenting ? -0.035 : sitting ? 0.025 : 0;
          pelvisGroup.rotation.z = -torso.rotation.z * 0.45;
          pelvisGroup.position.x = -torso.rotation.z * 0.30;

          if (walking) {
            const stride = Math.sin(t * 7.2);
            armGroups[0].rotation.x = stride * 0.22;
            armGroups[1].rotation.x = -stride * 0.22;
            legGroups[0].rotation.x = -stride * 0.16;
            legGroups[1].rotation.x = stride * 0.16;
          } else {
            armGroups[0].rotation.x += (-0.04 - armGroups[0].rotation.x) * 0.08;
            armGroups[1].rotation.x += (-0.025 - armGroups[1].rotation.x) * 0.08;
            legGroups[0].rotation.x += (0 - legGroups[0].rotation.x) * 0.08;
            legGroups[1].rotation.x += (0 - legGroups[1].rotation.x) * 0.08;
          }

          const armRelax = listening ? 0.05 : presenting ? 0.08 : 0.025;
          armGroups[0].rotation.z = 0.045 + armRelax;
          armGroups[1].rotation.z = -0.045 - armRelax * 0.8;
          legGroups[0].rotation.z = listening ? 0.012 : 0.006;
          legGroups[1].rotation.z = listening ? -0.018 : -0.006;

          idleFrame = window.requestAnimationFrame(animateIdle);
        };
        idleFrame = window.requestAnimationFrame(animateIdle);

        window.addEventListener("pagehide", () => window.removeEventListener("isabel-three-state", stateListener), { once: true });
      };

      objectPrototype.add = function patchedAdd(...objects: import("three").Object3D[]) {
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
        objectPrototype.add = originalAdd;
        if (idleFrame) window.cancelAnimationFrame(idleFrame);
      };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
      if (idleFrame) window.cancelAnimationFrame(idleFrame);
    };
  }, []);

  return null;
}
