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
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V10")) return;

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

        headPivot.scale.setScalar(0.655);
        headPivot.position.set(0, 4.26, 0.075);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V10";
        originalAdd.call(rig, human);

        const torso = new THREE.Group();
        torso.name = "HUMAN_TORSO_GROUP";
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
          mesh.castShadow = true;
          parent.add(mesh);
          return mesh;
        };

        addMesh(torso, new THREE.CylinderGeometry(0.118, 0.158, 0.21, 24), skin, "HUMAN_NECK", 0, 3.98, 0, 1, 1, 0.88);

        const clavicle = addMesh(torso, new THREE.CapsuleGeometry(0.075, 0.68, 6, 16), suit, "CLAVICLE_LINE", 0, 3.80, 0.0, 1, 1, 0.90);
        clavicle.rotation.z = Math.PI / 2;

        addMesh(torso, new THREE.CylinderGeometry(0.515, 0.455, 0.30, 32), suit, "BLAZER_CHEST", 0, 3.69, 0.012, 1.02, 1, 0.56);
        addMesh(torso, new THREE.CylinderGeometry(0.455, 0.405, 0.34, 32), suit, "BLAZER_RIBCAGE", 0, 3.38, 0.016, 1.01, 1, 0.565);
        addMesh(torso, new THREE.CylinderGeometry(0.405, 0.415, 0.36, 32), suit, "BLAZER_WAIST", 0, 3.04, 0.018, 1.00, 1, 0.575);
        addMesh(torso, new THREE.CylinderGeometry(0.415, 0.455, 0.31, 32), suit, "BLAZER_HEM", 0, 2.71, 0.020, 1.00, 1, 0.585);
        addMesh(torso, new THREE.CylinderGeometry(0.455, 0.470, 0.16, 32), suitSoft, "BLAZER_LOWER_BLEND", 0, 2.48, 0.020, 1.00, 1, 0.59);

        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.470, 0.505, 0.28, 32), suitSoft, "PELVIS_UPPER", 0, 2.29, 0.020, 1.02, 1, 0.61);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.505, 0.455, 0.25, 32), suitSoft, "PELVIS_LOWER", 0, 2.03, 0.020, 1.00, 1, 0.605);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.455, 0.375, 0.17, 28), suitSoft, "PELVIS_LEG_BLEND", 0, 1.82, 0.020, 1.00, 1, 0.60);
        addMesh(pelvisGroup, new THREE.SphereGeometry(0.16, 18, 12), suitSoft, "HIP_BLEND_L", -0.395, 2.15, 0.02, 1.0, 1.20, 0.58);
        addMesh(pelvisGroup, new THREE.SphereGeometry(0.16, 18, 12), suitSoft, "HIP_BLEND_R", 0.395, 2.15, 0.02, 1.0, 1.20, 0.58);

        addMesh(torso, new THREE.PlaneGeometry(0.15, 0.48), blouse, "BLOUSE_OPENING", 0, 3.53, 0.308);
        const lapelL = addMesh(torso, new THREE.BoxGeometry(0.095, 0.40, 0.020), suitSoft, "LAPEL_L", -0.105, 3.53, 0.306);
        lapelL.rotation.z = -0.24;
        const lapelR = addMesh(torso, new THREE.BoxGeometry(0.095, 0.40, 0.020), suitSoft, "LAPEL_R", 0.105, 3.53, 0.306);
        lapelR.rotation.z = 0.24;

        const armGroups: import("three").Group[] = [];
        const forearmGroups: import("three").Group[] = [];
        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.435;
          const arm = new THREE.Group();
          arm.name = side < 0 ? "ARM_L" : "ARM_R";
          arm.position.set(shoulderX, 3.60, 0.012);
          human.add(arm);
          armGroups.push(arm);

          const shoulder = addMesh(arm, new THREE.CapsuleGeometry(0.060, 0.175, 6, 12), suit, `BLAZER_SHOULDER_${side}`, side * 0.006, -0.075, 0.008, 1.16, 1, 0.90);
          shoulder.rotation.z = Math.PI / 2 + side * -0.24;

          const upper = addMesh(arm, new THREE.CapsuleGeometry(0.076, 0.63, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.018, -0.51, 0.020, 0.94, 1, 0.88);
          upper.rotation.z = side * -0.050;
          upper.rotation.x = -0.070;

          addMesh(arm, new THREE.SphereGeometry(0.064, 14, 10), suit, `ELBOW_${side}`, side * 0.038, -0.96, 0.046, 0.78, 0.58, 0.78);

          const forearm = new THREE.Group();
          forearm.name = side < 0 ? "FOREARM_GROUP_L" : "FOREARM_GROUP_R";
          forearm.position.set(side * 0.038, -0.96, 0.046);
          arm.add(forearm);
          forearmGroups.push(forearm);

          const fore = addMesh(forearm, new THREE.CapsuleGeometry(0.062, 0.58, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.022, -0.40, 0.055, 0.92, 1, 0.86);
          fore.rotation.z = side * -0.022;
          fore.rotation.x = -0.09;

          addMesh(forearm, new THREE.CylinderGeometry(0.048, 0.057, 0.14, 14), skin, `WRIST_${side}`, side * 0.030, -0.75, 0.082, 1, 1, 0.87);
          const hand = addMesh(forearm, new THREE.CapsuleGeometry(0.073, 0.235, 5, 10), skin, `HAND_${side}`, side * 0.035, -0.98, 0.095, 0.88, 1, 0.58);
          hand.rotation.z = side * -0.014;
          hand.rotation.x = -0.035;
        };
        makeArm(-1);
        makeArm(1);

        const legGroups: import("three").Group[] = [];
        const makeLeg = (side: -1 | 1) => {
          const x = side * 0.205;
          const leg = new THREE.Group();
          leg.name = side < 0 ? "LEG_L" : "LEG_R";
          leg.position.set(x, 2.18, 0.018);
          human.add(leg);
          legGroups.push(leg);

          addMesh(leg, new THREE.CylinderGeometry(0.170, 0.145, 0.34, 20), suitSoft, `UPPER_THIGH_BLEND_${side}`, 0, -0.17, 0, 1, 1, 0.92);
          const thigh = addMesh(leg, new THREE.CapsuleGeometry(0.150, 0.84, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.66, 0, 1.00, 1, 0.93);
          thigh.rotation.z = side * 0.002;

          addMesh(leg, new THREE.SphereGeometry(0.100, 14, 10), suitSoft, `KNEE_${side}`, side * 0.002, -1.22, 0.020, 0.82, 0.58, 0.82);

          const calf = addMesh(leg, new THREE.CapsuleGeometry(0.128, 0.79, 6, 12), suitSoft, `CALF_${side}`, side * 0.003, -1.66, 0.016, 1.03, 1, 0.91);
          calf.rotation.z = side * -0.002;
          addMesh(leg, new THREE.CylinderGeometry(0.081, 0.091, 0.18, 14), suitSoft, `ANKLE_${side}`, side * 0.003, -2.11, 0.030, 1, 1, 0.90);

          const foot = addMesh(leg, new THREE.BoxGeometry(0.305, 0.145, 0.64), shoe, `FOOT_${side}`, side * 0.015, -2.27, 0.20);
          foot.rotation.y = side * 0.032;
          const heel = addMesh(leg, new THREE.BoxGeometry(0.16, 0.12, 0.18), shoe, `HEEL_${side}`, side * 0.015, -2.31, -0.02);
          heel.rotation.y = side * 0.032;
        };
        makeLeg(-1);
        makeLeg(1);

        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.054, 14, 10), skin);
        earL.scale.set(0.48, 1, 0.42);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.128, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.136, 0.014, 0.019), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.048;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.048;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 10), skin);
        chin.scale.set(1.10, 0.44, 0.61);
        chin.position.set(0, -0.34, 0.34);
        headPivot.add(chin);

        const stateListener = (event: Event) => {
          activeState = (event as CustomEvent<MotionState>).detail ?? activeState;
        };
        window.addEventListener("isabel-three-state", stateListener);

        const baseHeadY = headPivot.position.y;
        let floorCompensation = 0;

        const animateIdle = () => {
          if (disposed) return;
          const t = performance.now() * 0.001;
          const walking = activeState === "walk" || activeState === "return";
          const listening = activeState === "listen";
          const presenting = activeState === "present";
          const notice = activeState === "notice";
          const loweredByParent = activeState === "working" || activeState === "notice" || activeState === "sit";

          const targetCompensation = loweredByParent ? 0.72 : 0;
          floorCompensation += (targetCompensation - floorCompensation) * 0.12;
          human.position.y = floorCompensation;

          const breath = Math.sin(t * 1.45);
          torso.scale.y = 1 + breath * 0.0025;
          torso.scale.x = 1 + breath * 0.0010;
          headPivot.position.y = baseHeadY + floorCompensation + breath * 0.003;

          const sway = Math.sin(t * 0.47);
          human.position.x = sway * (walking ? 0.0015 : 0.0045);
          human.rotation.z = sway * (listening ? 0.004 : 0.0018);

          const desiredTorsoZ = listening ? -0.009 + sway * 0.0018 : presenting ? 0.007 : notice ? -0.0025 : sway * 0.001;
          const desiredTorsoX = presenting ? -0.018 : notice ? -0.005 : 0;
          torso.rotation.z += (desiredTorsoZ - torso.rotation.z) * 0.10;
          torso.rotation.x += (desiredTorsoX - torso.rotation.x) * 0.10;
          pelvisGroup.rotation.z += ((-desiredTorsoZ * 0.30) - pelvisGroup.rotation.z) * 0.10;
          pelvisGroup.position.x += ((-desiredTorsoZ * 0.16) - pelvisGroup.position.x) * 0.10;

          if (walking) {
            const stride = Math.sin(t * 6.8);
            const hipBob = Math.abs(Math.sin(t * 6.8)) * 0.006;
            human.position.y = floorCompensation + hipBob;
            armGroups[0].rotation.x = stride * 0.14;
            armGroups[1].rotation.x = -stride * 0.14;
            forearmGroups[0].rotation.x = -0.12 - Math.max(0, -stride) * 0.06;
            forearmGroups[1].rotation.x = -0.12 - Math.max(0, stride) * 0.06;
            legGroups[0].rotation.x = -stride * 0.105;
            legGroups[1].rotation.x = stride * 0.105;
            legGroups[0].position.y = Math.max(0, stride) * 0.009;
            legGroups[1].position.y = Math.max(0, -stride) * 0.009;
          } else {
            const leftArmTarget = presenting ? -0.006 : listening ? -0.026 : -0.040;
            const rightArmTarget = presenting ? -0.010 : listening ? -0.018 : -0.028;
            armGroups[0].rotation.x += (leftArmTarget - armGroups[0].rotation.x) * 0.10;
            armGroups[1].rotation.x += (rightArmTarget - armGroups[1].rotation.x) * 0.10;

            const leftElbowTarget = presenting ? -0.28 : listening ? -0.16 : -0.10;
            const rightElbowTarget = presenting ? -0.18 : listening ? -0.12 : -0.09;
            forearmGroups[0].rotation.x += (leftElbowTarget - forearmGroups[0].rotation.x) * 0.10;
            forearmGroups[1].rotation.x += (rightElbowTarget - forearmGroups[1].rotation.x) * 0.10;

            legGroups[0].rotation.x += (0 - legGroups[0].rotation.x) * 0.10;
            legGroups[1].rotation.x += (0 - legGroups[1].rotation.x) * 0.10;
            legGroups[0].position.y += (0 - legGroups[0].position.y) * 0.10;
            legGroups[1].position.y += (0 - legGroups[1].position.y) * 0.10;
          }

          const armRelax = listening ? 0.022 : presenting ? 0.038 : notice ? 0.018 : 0.010;
          armGroups[0].rotation.z += ((0.018 + armRelax) - armGroups[0].rotation.z) * 0.10;
          armGroups[1].rotation.z += ((-0.018 - armRelax * 0.68) - armGroups[1].rotation.z) * 0.10;

          const stanceL = listening ? 0.005 : 0.0015;
          const stanceR = listening ? -0.008 : -0.0015;
          legGroups[0].rotation.z += (stanceL - legGroups[0].rotation.z) * 0.10;
          legGroups[1].rotation.z += (stanceR - legGroups[1].rotation.z) * 0.10;

          idleFrame = window.requestAnimationFrame(animateIdle);
        };
        idleFrame = window.requestAnimationFrame(animateIdle);

        window.addEventListener(
          "pagehide",
          () => window.removeEventListener("isabel-three-state", stateListener),
          { once: true },
        );
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
