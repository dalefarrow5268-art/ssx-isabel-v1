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
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V8")) return;

        const headPivot = rig.children.find(
          (child) =>
            (child as import("three").Group).isGroup &&
            child.position.y > 3.5 &&
            child.position.y < 4.2 &&
            child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.6 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.66 });
        const blouse = new THREE.MeshStandardMaterial({ color: 0x050609, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x21120e, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x050609, roughness: 0.42 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        // Reference-driven adult head/body balance.
        headPivot.scale.setScalar(0.685);
        headPivot.position.set(0, 4.28, 0.065);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V8";
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
          parent.add(mesh);
          return mesh;
        };

        // Shorter neck and a lower shoulder line closer to the standing reference.
        addMesh(torso, new THREE.CylinderGeometry(0.125, 0.165, 0.25, 24), skin, "HUMAN_NECK", 0, 3.985, 0, 1, 1, 0.9);

        // Blazer silhouette: broad enough through upper ribs, then a controlled taper.
        addMesh(torso, new THREE.CylinderGeometry(0.50, 0.42, 0.42, 32), suit, "BLAZER_UPPER", 0, 3.72, 0.015, 1.03, 1, 0.60);
        addMesh(torso, new THREE.CylinderGeometry(0.42, 0.375, 0.44, 32), suit, "BLAZER_MID", 0, 3.30, 0.02, 1.02, 1, 0.60);
        addMesh(torso, new THREE.CylinderGeometry(0.375, 0.405, 0.44, 32), suit, "BLAZER_WAIST", 0, 2.88, 0.02, 1.02, 1, 0.61);
        addMesh(torso, new THREE.CylinderGeometry(0.405, 0.44, 0.32, 32), suit, "BLAZER_HEM", 0, 2.50, 0.02, 1.02, 1, 0.62);

        // Pelvis/upper-thigh connection: fuller than V7, but shallow front-to-back.
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.44, 0.475, 0.34, 32), suitSoft, "PELVIS_UPPER", 0, 2.22, 0.02, 1.02, 1, 0.63);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.475, 0.405, 0.28, 32), suitSoft, "PELVIS_LOWER", 0, 1.93, 0.02, 1.0, 1, 0.62);

        // Blazer opening and lapels, kept subtle and black-on-black.
        addMesh(torso, new THREE.PlaneGeometry(0.17, 0.54), blouse, "BLOUSE_OPENING", 0, 3.55, 0.33);
        const lapelL = addMesh(torso, new THREE.BoxGeometry(0.11, 0.46, 0.022), suitSoft, "LAPEL_L", -0.115, 3.55, 0.329);
        lapelL.rotation.z = -0.22;
        const lapelR = addMesh(torso, new THREE.BoxGeometry(0.11, 0.46, 0.022), suitSoft, "LAPEL_R", 0.115, 3.55, 0.329);
        lapelR.rotation.z = 0.22;

        const armGroups: import("three").Group[] = [];
        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.455;
          const arm = new THREE.Group();
          arm.name = side < 0 ? "ARM_L" : "ARM_R";
          arm.position.set(shoulderX, 3.67, 0.02);
          human.add(arm);
          armGroups.push(arm);

          // Sloped sleeve cap instead of a visible joint ball.
          const shoulder = addMesh(arm, new THREE.CapsuleGeometry(0.068, 0.19, 6, 12), suit, `BLAZER_SHOULDER_${side}`, side * 0.012, -0.09, 0.015, 1.2, 1, 0.95);
          shoulder.rotation.z = Math.PI / 2 + side * -0.18;

          // Longer upper arms, kept closer to the body.
          const upper = addMesh(arm, new THREE.CapsuleGeometry(0.080, 0.60, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.035, -0.49, 0.035, 0.96, 1, 0.90);
          upper.rotation.z = side * -0.075;
          upper.rotation.x = -0.055;

          addMesh(arm, new THREE.SphereGeometry(0.070, 14, 10), suit, `ELBOW_${side}`, side * 0.072, -0.91, 0.065, 0.82, 0.62, 0.82);

          // Forearms hang naturally with a small forward bend.
          const fore = addMesh(arm, new THREE.CapsuleGeometry(0.066, 0.55, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.095, -1.30, 0.11, 0.94, 1, 0.88);
          fore.rotation.z = side * -0.04;
          fore.rotation.x = -0.12;

          addMesh(arm, new THREE.CylinderGeometry(0.050, 0.060, 0.14, 14), skin, `WRIST_${side}`, side * 0.11, -1.63, 0.135, 1, 1, 0.9);
          const hand = addMesh(arm, new THREE.CapsuleGeometry(0.073, 0.225, 5, 10), skin, `HAND_${side}`, side * 0.12, -1.85, 0.15, 0.88, 1, 0.58);
          hand.rotation.z = side * -0.025;
        };
        makeArm(-1);
        makeArm(1);

        const legGroups: import("three").Group[] = [];
        const makeLeg = (side: -1 | 1) => {
          const x = side * 0.205;
          const leg = new THREE.Group();
          leg.name = side < 0 ? "LEG_L" : "LEG_R";
          leg.position.set(x, 1.83, 0.02);
          human.add(leg);
          legGroups.push(leg);

          // Upper thighs meet the pelvis with more volume, then taper toward the knee.
          const thigh = addMesh(leg, new THREE.CapsuleGeometry(0.150, 0.98, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.50, 0, 1.02, 1, 0.96);
          thigh.rotation.z = side * 0.004;

          addMesh(leg, new THREE.SphereGeometry(0.108, 14, 10), suitSoft, `KNEE_${side}`, side * 0.003, -1.11, 0.024, 0.86, 0.62, 0.86);

          // Calves retain shape; ankles no longer look like needles.
          const calf = addMesh(leg, new THREE.CapsuleGeometry(0.122, 0.84, 6, 12), suitSoft, `CALF_${side}`, side * 0.006, -1.58, 0.02, 1.0, 1, 0.94);
          calf.rotation.z = side * -0.003;
          addMesh(leg, new THREE.CylinderGeometry(0.078, 0.087, 0.18, 14), suitSoft, `ANKLE_${side}`, side * 0.006, -2.05, 0.034, 1, 1, 0.92);
          const foot = addMesh(leg, new THREE.BoxGeometry(0.295, 0.15, 0.61), shoe, `FOOT_${side}`, side * 0.018, -2.21, 0.18);
          foot.rotation.y = side * 0.04;
        };
        makeLeg(-1);
        makeLeg(1);

        // Face orientation cues only. Existing working eyes and mouth remain untouched.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), skin);
        earL.scale.set(0.5, 1, 0.44);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.135, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.020), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.055;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.055;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 10), skin);
        chin.scale.set(1.14, 0.46, 0.64);
        chin.position.set(0, -0.34, 0.34);
        headPivot.add(chin);

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
          const working = activeState === "working" || activeState === "sit";
          const notice = activeState === "notice";

          const breath = Math.sin(t * 1.5);
          torso.scale.y = 1 + breath * 0.003;
          torso.scale.x = 1 + breath * 0.0014;
          headPivot.position.y = baseHeadY + breath * 0.004;

          const sway = Math.sin(t * 0.54);
          human.position.x = sway * (walking ? 0.0025 : 0.006);
          human.rotation.z = sway * (listening ? 0.005 : 0.0025);

          const desiredTorsoZ = listening ? -0.012 + sway * 0.0025 : presenting ? 0.009 : notice ? -0.004 : sway * 0.0015;
          const desiredTorsoX = presenting ? -0.022 : working ? 0.012 : notice ? -0.008 : 0;
          torso.rotation.z += (desiredTorsoZ - torso.rotation.z) * 0.08;
          torso.rotation.x += (desiredTorsoX - torso.rotation.x) * 0.08;
          pelvisGroup.rotation.z += ((-desiredTorsoZ * 0.34) - pelvisGroup.rotation.z) * 0.08;
          pelvisGroup.position.x += ((-desiredTorsoZ * 0.20) - pelvisGroup.position.x) * 0.08;

          if (walking) {
            const stride = Math.sin(t * 7.2);
            const lift = Math.max(0, Math.sin(t * 7.2 + Math.PI / 2));
            armGroups[0].rotation.x = stride * 0.17;
            armGroups[1].rotation.x = -stride * 0.17;
            legGroups[0].rotation.x = -stride * 0.13;
            legGroups[1].rotation.x = stride * 0.13;
            legGroups[0].position.y = lift * 0.012;
            legGroups[1].position.y = Math.max(0, -Math.sin(t * 7.2 + Math.PI / 2)) * 0.012;
          } else {
            const leftArmTarget = presenting ? -0.01 : listening ? -0.035 : -0.05;
            const rightArmTarget = presenting ? -0.015 : listening ? -0.025 : -0.035;
            armGroups[0].rotation.x += (leftArmTarget - armGroups[0].rotation.x) * 0.08;
            armGroups[1].rotation.x += (rightArmTarget - armGroups[1].rotation.x) * 0.08;
            legGroups[0].rotation.x += (0 - legGroups[0].rotation.x) * 0.08;
            legGroups[1].rotation.x += (0 - legGroups[1].rotation.x) * 0.08;
            legGroups[0].position.y += (0 - legGroups[0].position.y) * 0.08;
            legGroups[1].position.y += (0 - legGroups[1].position.y) * 0.08;
          }

          const armRelax = listening ? 0.032 : presenting ? 0.055 : notice ? 0.025 : 0.016;
          armGroups[0].rotation.z += ((0.028 + armRelax) - armGroups[0].rotation.z) * 0.08;
          armGroups[1].rotation.z += ((-0.028 - armRelax * 0.75) - armGroups[1].rotation.z) * 0.08;

          const stanceL = listening ? 0.008 : 0.003;
          const stanceR = listening ? -0.014 : -0.003;
          legGroups[0].rotation.z += (stanceL - legGroups[0].rotation.z) * 0.08;
          legGroups[1].rotation.z += (stanceR - legGroups[1].rotation.z) * 0.08;

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
