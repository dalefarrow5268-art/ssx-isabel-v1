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
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V7")) return;

        const headPivot = rig.children.find((child) =>
          (child as import("three").Group).isGroup && child.position.y > 3.5 && child.position.y < 4.2 && child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x0d0f14, roughness: 0.60 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.66 });
        const blouse = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x21120e, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.42 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        headPivot.scale.setScalar(0.70);
        headPivot.position.set(0, 4.35, 0.06);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V7";
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

        // Neck and blazer body: broader through ribs, controlled waist, smooth hem.
        addMesh(torso, new THREE.CylinderGeometry(0.13, 0.17, 0.28, 24), skin, "HUMAN_NECK", 0, 4.03, 0, 1, 1, 0.92);
        addMesh(torso, new THREE.CylinderGeometry(0.535, 0.405, 0.78, 30), suit, "BLAZER_CHEST", 0, 3.56, 0.015, 1.05, 1, 0.61);
        addMesh(torso, new THREE.CylinderGeometry(0.405, 0.425, 0.40, 30), suit, "BLAZER_WAIST", 0, 2.98, 0.02, 1.02, 1, 0.62);
        addMesh(torso, new THREE.CylinderGeometry(0.425, 0.455, 0.34, 30), suit, "BLAZER_HEM", 0, 2.62, 0.02, 1.02, 1, 0.63);

        // Pelvis and upper-hip transition kept subtle and continuous.
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.445, 0.47, 0.44, 30), suitSoft, "PELVIS_TAPER", 0, 2.30, 0.02, 1.02, 1, 0.64);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.425, 0.36, 0.25, 28), suitSoft, "LOWER_PELVIS", 0, 1.98, 0.02, 1.02, 1, 0.62);

        // Black blouse opening and lapels give the torso the locked professional wardrobe read.
        addMesh(torso, new THREE.PlaneGeometry(0.20, 0.54), blouse, "BLOUSE_OPENING", 0, 3.55, 0.337);
        const lapelL = addMesh(torso, new THREE.BoxGeometry(0.14, 0.52, 0.028), suitSoft, "LAPEL_L", -0.13, 3.55, 0.335);
        lapelL.rotation.z = -0.18;
        const lapelR = addMesh(torso, new THREE.BoxGeometry(0.14, 0.52, 0.028), suitSoft, "LAPEL_R", 0.13, 3.55, 0.335);
        lapelR.rotation.z = 0.18;

        const armGroups: import("three").Group[] = [];
        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.49;
          const arm = new THREE.Group();
          arm.name = side < 0 ? "ARM_L" : "ARM_R";
          arm.position.set(shoulderX, 3.69, 0.02);
          human.add(arm);
          armGroups.push(arm);

          // Shoulder sleeve bridge is flattened/sloped instead of spherical.
          const shoulder = addMesh(arm, new THREE.CapsuleGeometry(0.075, 0.22, 6, 12), suit, `BLAZER_SHOULDER_${side}`, side * 0.015, -0.10, 0.015, 1.18, 1, 0.98);
          shoulder.rotation.z = Math.PI / 2 + side * -0.12;

          const upper = addMesh(arm, new THREE.CapsuleGeometry(0.084, 0.58, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.050, -0.49, 0.035, 0.98, 1, 0.92);
          upper.rotation.z = side * -0.11;
          upper.rotation.x = -0.06;

          addMesh(arm, new THREE.SphereGeometry(0.074, 14, 10), suit, `ELBOW_${side}`, side * 0.108, -0.90, 0.065, 0.84, 0.66, 0.84);

          const fore = addMesh(arm, new THREE.CapsuleGeometry(0.069, 0.52, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.135, -1.28, 0.115, 0.95, 1, 0.90);
          fore.rotation.z = side * -0.055;
          fore.rotation.x = -0.11;

          addMesh(arm, new THREE.CylinderGeometry(0.054, 0.063, 0.14, 14), skin, `WRIST_${side}`, side * 0.155, -1.59, 0.14, 1, 1, 0.90);
          const hand = addMesh(arm, new THREE.CapsuleGeometry(0.075, 0.22, 5, 10), skin, `HAND_${side}`, side * 0.168, -1.80, 0.155, 0.90, 1, 0.60);
          hand.rotation.z = side * -0.035;
        };
        makeArm(-1);
        makeArm(1);

        const legGroups: import("three").Group[] = [];
        const makeLeg = (side: -1 | 1) => {
          const x = side * 0.215;
          const leg = new THREE.Group();
          leg.name = side < 0 ? "LEG_L" : "LEG_R";
          leg.position.set(x, 1.92, 0.02);
          human.add(leg);
          legGroups.push(leg);

          // Longer, cleaner leg line modeled after the standing reference.
          const thigh = addMesh(leg, new THREE.CapsuleGeometry(0.142, 0.96, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.50, 0, 1.02, 1, 0.95);
          thigh.rotation.z = side * 0.006;
          addMesh(leg, new THREE.SphereGeometry(0.108, 14, 10), suitSoft, `KNEE_${side}`, side * 0.004, -1.10, 0.025, 0.88, 0.64, 0.88);
          const calf = addMesh(leg, new THREE.CapsuleGeometry(0.118, 0.82, 6, 12), suitSoft, `CALF_${side}`, side * 0.008, -1.56, 0.02, 1.0, 1, 0.94);
          calf.rotation.z = side * -0.004;
          addMesh(leg, new THREE.CylinderGeometry(0.076, 0.084, 0.18, 14), suitSoft, `ANKLE_${side}`, side * 0.008, -2.02, 0.035, 1, 1, 0.92);
          const foot = addMesh(leg, new THREE.BoxGeometry(0.29, 0.15, 0.60), shoe, `FOOT_${side}`, side * 0.020, -2.18, 0.18);
          foot.rotation.y = side * 0.045;
        };
        makeLeg(-1);
        makeLeg(1);

        // Orientation cues around the existing working face; mouth and eyes remain untouched.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.060, 14, 10), skin);
        earL.scale.set(0.52, 1, 0.46);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone(); earR.position.x = 0.445; headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.14, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.015, 0.020), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.06;
        headPivot.add(browL);
        const browR = browL.clone(); browR.position.x = 0.17; browR.rotation.z = 0.06; headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 10), skin);
        chin.scale.set(1.16, 0.48, 0.66);
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

          const breath = Math.sin(t * 1.55);
          torso.scale.y = 1 + breath * 0.0035;
          torso.scale.x = 1 + breath * 0.0018;
          headPivot.position.y = baseHeadY + breath * 0.0045;

          const sway = Math.sin(t * 0.58);
          human.position.x = sway * (walking ? 0.003 : 0.007);
          human.rotation.z = sway * (listening ? 0.006 : 0.003);
          torso.rotation.z = listening ? -0.014 + sway * 0.003 : presenting ? 0.010 : sway * 0.002;
          torso.rotation.x = presenting ? -0.026 : working ? 0.016 : 0;
          pelvisGroup.rotation.z = -torso.rotation.z * 0.40;
          pelvisGroup.position.x = -torso.rotation.z * 0.24;

          if (walking) {
            const stride = Math.sin(t * 7.2);
            armGroups[0].rotation.x = stride * 0.18;
            armGroups[1].rotation.x = -stride * 0.18;
            legGroups[0].rotation.x = -stride * 0.14;
            legGroups[1].rotation.x = stride * 0.14;
          } else {
            armGroups[0].rotation.x += (-0.045 - armGroups[0].rotation.x) * 0.08;
            armGroups[1].rotation.x += (-0.030 - armGroups[1].rotation.x) * 0.08;
            legGroups[0].rotation.x += (0 - legGroups[0].rotation.x) * 0.08;
            legGroups[1].rotation.x += (0 - legGroups[1].rotation.x) * 0.08;
          }

          const armRelax = listening ? 0.040 : presenting ? 0.070 : 0.022;
          armGroups[0].rotation.z = 0.035 + armRelax;
          armGroups[1].rotation.z = -0.035 - armRelax * 0.78;
          legGroups[0].rotation.z = listening ? 0.010 : 0.004;
          legGroups[1].rotation.z = listening ? -0.016 : -0.004;

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
