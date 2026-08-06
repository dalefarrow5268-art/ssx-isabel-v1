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
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V9")) return;

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

        // 01-02: adult head balance and vertical placement.
        headPivot.scale.setScalar(0.67);
        headPivot.position.set(0, 4.30, 0.07);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V9";
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

        // 03: shorter neck.
        addMesh(torso, new THREE.CylinderGeometry(0.122, 0.16, 0.23, 24), skin, "HUMAN_NECK", 0, 4.00, 0, 1, 1, 0.88);

        // 04-08: continuous blazer torso, flatter front-to-back and closer to reference proportions.
        addMesh(torso, new THREE.CylinderGeometry(0.50, 0.44, 0.34, 32), suit, "BLAZER_CHEST", 0, 3.77, 0.01, 1.02, 1, 0.56);
        addMesh(torso, new THREE.CylinderGeometry(0.44, 0.39, 0.38, 32), suit, "BLAZER_RIBCAGE", 0, 3.42, 0.015, 1.01, 1, 0.57);
        addMesh(torso, new THREE.CylinderGeometry(0.39, 0.405, 0.39, 32), suit, "BLAZER_WAIST", 0, 3.05, 0.018, 1.00, 1, 0.58);
        addMesh(torso, new THREE.CylinderGeometry(0.405, 0.445, 0.34, 32), suit, "BLAZER_HEM", 0, 2.69, 0.02, 1.00, 1, 0.59);
        addMesh(torso, new THREE.CylinderGeometry(0.44, 0.46, 0.18, 32), suitSoft, "BLAZER_LOWER_BLEND", 0, 2.48, 0.02, 1.00, 1, 0.60);

        // 09-11: pelvis and upper-thigh bridge.
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.445, 0.485, 0.30, 32), suitSoft, "PELVIS_UPPER", 0, 2.28, 0.02, 1.02, 1, 0.61);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.485, 0.43, 0.27, 32), suitSoft, "PELVIS_LOWER", 0, 2.01, 0.02, 1.00, 1, 0.61);
        addMesh(pelvisGroup, new THREE.CylinderGeometry(0.43, 0.355, 0.18, 28), suitSoft, "PELVIS_LEG_BLEND", 0, 1.80, 0.02, 1.00, 1, 0.60);

        // 12-14: black-on-black blouse/lapel structure.
        addMesh(torso, new THREE.PlaneGeometry(0.16, 0.50), blouse, "BLOUSE_OPENING", 0, 3.57, 0.306);
        const lapelL = addMesh(torso, new THREE.BoxGeometry(0.10, 0.43, 0.02), suitSoft, "LAPEL_L", -0.105, 3.57, 0.305);
        lapelL.rotation.z = -0.23;
        const lapelR = addMesh(torso, new THREE.BoxGeometry(0.10, 0.43, 0.02), suitSoft, "LAPEL_R", 0.105, 3.57, 0.305);
        lapelR.rotation.z = 0.23;

        const armGroups: import("three").Group[] = [];
        const makeArm = (side: -1 | 1) => {
          // 15-16: lower/narrower shoulder attachment.
          const shoulderX = side * 0.44;
          const arm = new THREE.Group();
          arm.name = side < 0 ? "ARM_L" : "ARM_R";
          arm.position.set(shoulderX, 3.62, 0.015);
          human.add(arm);
          armGroups.push(arm);

          // 17: sloped sleeve cap.
          const shoulder = addMesh(arm, new THREE.CapsuleGeometry(0.064, 0.18, 6, 12), suit, `BLAZER_SHOULDER_${side}`, side * 0.010, -0.075, 0.01, 1.18, 1, 0.92);
          shoulder.rotation.z = Math.PI / 2 + side * -0.22;

          // 18-19: longer upper arm and relaxed inward angle.
          const upper = addMesh(arm, new THREE.CapsuleGeometry(0.078, 0.62, 6, 12), suit, `UPPER_ARM_${side}`, side * 0.025, -0.50, 0.025, 0.95, 1, 0.90);
          upper.rotation.z = side * -0.060;
          upper.rotation.x = -0.065;

          // 20: smaller elbow.
          addMesh(arm, new THREE.SphereGeometry(0.066, 14, 10), suit, `ELBOW_${side}`, side * 0.050, -0.94, 0.052, 0.80, 0.60, 0.80);

          // 21-22: longer forearm with natural forward bend.
          const fore = addMesh(arm, new THREE.CapsuleGeometry(0.064, 0.57, 6, 12), suitSoft, `FOREARM_${side}`, side * 0.065, -1.35, 0.095, 0.93, 1, 0.88);
          fore.rotation.z = side * -0.030;
          fore.rotation.x = -0.13;

          // 23-24: cleaner wrist/hand proportions.
          addMesh(arm, new THREE.CylinderGeometry(0.049, 0.058, 0.14, 14), skin, `WRIST_${side}`, side * 0.075, -1.69, 0.12, 1, 1, 0.88);
          const hand = addMesh(arm, new THREE.CapsuleGeometry(0.071, 0.23, 5, 10), skin, `HAND_${side}`, side * 0.080, -1.91, 0.135, 0.86, 1, 0.56);
          hand.rotation.z = side * -0.018;
          hand.rotation.x = -0.03;
        };
        makeArm(-1);
        makeArm(1);

        const legGroups: import("three").Group[] = [];
        const makeLeg = (side: -1 | 1) => {
          // 25-26: raise entire leg chain so feet sit on the floor and narrow stance slightly.
          const x = side * 0.198;
          const leg = new THREE.Group();
          leg.name = side < 0 ? "LEG_L" : "LEG_R";
          leg.position.set(x, 2.18, 0.02);
          human.add(leg);
          legGroups.push(leg);

          // 27-28: upper-thigh volume and length.
          const thigh = addMesh(leg, new THREE.CapsuleGeometry(0.152, 0.98, 6, 12), suitSoft, `THIGH_${side}`, 0, -0.55, 0, 1.02, 1, 0.95);
          thigh.rotation.z = side * 0.003;

          // 29: subtler knee.
          addMesh(leg, new THREE.SphereGeometry(0.104, 14, 10), suitSoft, `KNEE_${side}`, side * 0.002, -1.16, 0.023, 0.84, 0.60, 0.84);

          // 30-31: shaped calf and less tubular taper.
          const calf = addMesh(leg, new THREE.CapsuleGeometry(0.126, 0.82, 6, 12), suitSoft, `CALF_${side}`, side * 0.004, -1.62, 0.018, 1.02, 1, 0.92);
          calf.rotation.z = side * -0.003;

          // 32: stable ankle.
          addMesh(leg, new THREE.CylinderGeometry(0.080, 0.090, 0.18, 14), suitSoft, `ANKLE_${side}`, side * 0.004, -2.08, 0.032, 1, 1, 0.90);

          // 33-34: visible feet at floor level with slight toe-out.
          const foot = addMesh(leg, new THREE.BoxGeometry(0.30, 0.15, 0.63), shoe, `FOOT_${side}`, side * 0.016, -2.25, 0.19);
          foot.rotation.y = side * 0.035;
        };
        makeLeg(-1);
        makeLeg(1);

        // 35: face orientation cues only; working eyes/mouth are preserved.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 10), skin);
        earL.scale.set(0.5, 1, 0.44);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.043, 0.132, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.138, 0.014, 0.019), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.05;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.05;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.090, 16, 10), skin);
        chin.scale.set(1.12, 0.45, 0.62);
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
          const loweredByParent = activeState === "working" || activeState === "notice" || activeState === "sit";

          // 36: compensate the parent scene's -0.72 placeholder drop so legs never disappear below the floor.
          const targetCompensation = loweredByParent ? 0.72 : 0;
          floorCompensation += (targetCompensation - floorCompensation) * 0.11;
          human.position.y = floorCompensation;

          // 37: subtle breathing/weight shift on the new body.
          const breath = Math.sin(t * 1.5);
          torso.scale.y = 1 + breath * 0.0028;
          torso.scale.x = 1 + breath * 0.0012;
          headPivot.position.y = baseHeadY + floorCompensation + breath * 0.0035;
          const sway = Math.sin(t * 0.50);
          human.position.x = sway * (walking ? 0.002 : 0.005);
          human.rotation.z = sway * (listening ? 0.0045 : 0.002);

          // 38: state-aware torso/pelvis counterbalance.
          const desiredTorsoZ = listening ? -0.010 + sway * 0.002 : presenting ? 0.008 : activeState === "notice" ? -0.003 : sway * 0.0012;
          const desiredTorsoX = presenting ? -0.020 : activeState === "notice" ? -0.006 : 0;
          torso.rotation.z += (desiredTorsoZ - torso.rotation.z) * 0.09;
          torso.rotation.x += (desiredTorsoX - torso.rotation.x) * 0.09;
          pelvisGroup.rotation.z += ((-desiredTorsoZ * 0.32) - pelvisGroup.rotation.z) * 0.09;
          pelvisGroup.position.x += ((-desiredTorsoZ * 0.18) - pelvisGroup.position.x) * 0.09;

          // 39: controlled gait with smaller, more natural placeholder stride.
          if (walking) {
            const stride = Math.sin(t * 7.0);
            armGroups[0].rotation.x = stride * 0.15;
            armGroups[1].rotation.x = -stride * 0.15;
            legGroups[0].rotation.x = -stride * 0.115;
            legGroups[1].rotation.x = stride * 0.115;
            legGroups[0].position.y = Math.max(0, stride) * 0.010;
            legGroups[1].position.y = Math.max(0, -stride) * 0.010;
          } else {
            const leftArmTarget = presenting ? -0.005 : listening ? -0.030 : -0.045;
            const rightArmTarget = presenting ? -0.010 : listening ? -0.020 : -0.032;
            armGroups[0].rotation.x += (leftArmTarget - armGroups[0].rotation.x) * 0.09;
            armGroups[1].rotation.x += (rightArmTarget - armGroups[1].rotation.x) * 0.09;
            legGroups[0].rotation.x += (0 - legGroups[0].rotation.x) * 0.09;
            legGroups[1].rotation.x += (0 - legGroups[1].rotation.x) * 0.09;
            legGroups[0].position.y += (0 - legGroups[0].position.y) * 0.09;
            legGroups[1].position.y += (0 - legGroups[1].position.y) * 0.09;
          }

          // 40: relaxed standing/listening arm and leg stance.
          const armRelax = listening ? 0.026 : presenting ? 0.045 : activeState === "notice" ? 0.020 : 0.012;
          armGroups[0].rotation.z += ((0.022 + armRelax) - armGroups[0].rotation.z) * 0.09;
          armGroups[1].rotation.z += ((-0.022 - armRelax * 0.72) - armGroups[1].rotation.z) * 0.09;
          const stanceL = listening ? 0.006 : 0.002;
          const stanceR = listening ? -0.010 : -0.002;
          legGroups[0].rotation.z += (stanceL - legGroups[0].rotation.z) * 0.09;
          legGroups[1].rotation.z += (stanceR - legGroups[1].rotation.z) * 0.09;

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
