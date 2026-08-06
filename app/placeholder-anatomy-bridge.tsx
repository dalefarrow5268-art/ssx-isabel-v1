"use client";

import { useEffect } from "react";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const objectPrototype = THREE.Object3D.prototype;
      const originalAdd = objectPrototype.add;
      const pending = new WeakSet<import("three").Object3D>();

      const enhanceRig = (rig: import("three").Object3D) => {
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V3")) return;

        const headPivot = rig.children.find((child) =>
          (child as import("three").Group).isGroup &&
          child.position.y > 3.5 &&
          child.position.y < 4.2 &&
          child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.56 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x1b1e25, roughness: 0.64 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0xe8e3dc, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.42 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        // More adult head-to-body balance while preserving the existing working face controls.
        headPivot.scale.setScalar(0.78);
        headPivot.position.set(0, 4.64, 0.055);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V3";
        originalAdd.call(rig, human);

        const addMesh = (geometry: import("three").BufferGeometry, material: import("three").Material, name: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = name;
          mesh.position.set(x, y, z);
          mesh.scale.set(sx, sy, sz);
          human.add(mesh);
          return mesh;
        };

        // 01 slimmer visible neck.
        addMesh(new THREE.CylinderGeometry(0.145, 0.175, 0.50, 24), skin, "HUMAN_NECK", 0, 4.20, 0, 1, 1, 0.92);

        // 02 sloped shoulder bridge rather than a horizontal block.
        const shoulder = addMesh(new THREE.CapsuleGeometry(0.20, 0.94, 6, 18), suit, "SHOULDER_BRIDGE", 0, 3.91, 0, 1, 1, 1);
        shoulder.rotation.z = Math.PI / 2;
        shoulder.scale.set(1.02, 1, 1.22);

        // 03 upper rib cage: rounded and shallow in depth.
        addMesh(new THREE.SphereGeometry(0.56, 24, 18), suit, "UPPER_TORSO", 0, 3.53, 0, 1.02, 0.82, 0.50);

        // 04 lower rib cage taper.
        addMesh(new THREE.SphereGeometry(0.48, 24, 18), suit, "LOWER_TORSO", 0, 3.05, 0.005, 0.92, 0.72, 0.48);

        // 05 narrower natural waist.
        addMesh(new THREE.CylinderGeometry(0.35, 0.39, 0.50, 24), suitSoft, "WAIST", 0, 2.68, 0.01, 1, 1, 0.60);

        // 06 soft female hip silhouette.
        addMesh(new THREE.SphereGeometry(0.50, 24, 18), suitSoft, "HIPS", 0, 2.30, 0.02, 1.08, 0.62, 0.52);

        // 07 short pelvis connector under hips.
        addMesh(new THREE.CylinderGeometry(0.39, 0.34, 0.30, 24), suitSoft, "PELVIS", 0, 2.02, 0.02, 1, 1, 0.63);

        // 08 shirt opening gives the torso a front direction.
        const shirtPanel = addMesh(new THREE.PlaneGeometry(0.24, 0.72), shirt, "SHIRT_PANEL", 0, 3.44, 0.292);
        shirtPanel.rotation.x = 0;

        // 09 shoulder caps lowered for a softer shoulder slope.
        addMesh(new THREE.SphereGeometry(0.17, 18, 12), suit, "SHOULDER_L", -0.61, 3.78, 0, 1.10, 0.86, 0.98);
        addMesh(new THREE.SphereGeometry(0.17, 18, 12), suit, "SHOULDER_R", 0.61, 3.78, 0, 1.10, 0.86, 0.98);

        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.62;
          // 10/11 upper arms angle slightly inward instead of hanging as pipes.
          const upper = addMesh(new THREE.CapsuleGeometry(0.095, 0.66, 6, 12), suit, `UPPER_ARM_${side}`, shoulderX + side * 0.055, 3.24, 0.015);
          upper.rotation.z = side * -0.11;
          upper.rotation.x = -0.025;

          addMesh(new THREE.SphereGeometry(0.098, 14, 10), suit, `ELBOW_${side}`, shoulderX + side * 0.105, 2.77, 0.035, 0.92, 0.82, 0.92);

          // 12/13 forearms taper toward the wrist.
          const fore = addMesh(new THREE.CapsuleGeometry(0.078, 0.60, 6, 12), suitSoft, `FOREARM_${side}`, shoulderX + side * 0.135, 2.34, 0.075, 0.95, 1, 0.92);
          fore.rotation.z = side * -0.07;
          fore.rotation.x = -0.065;

          addMesh(new THREE.CylinderGeometry(0.055, 0.068, 0.16, 14), skin, `WRIST_${side}`, shoulderX + side * 0.16, 1.99, 0.095, 1, 1, 0.86);

          // 14/15 larger hand with flattened palm silhouette.
          const hand = addMesh(new THREE.CapsuleGeometry(0.075, 0.22, 5, 10), skin, `HAND_${side}`, shoulderX + side * 0.17, 1.78, 0.11, 0.88, 1, 0.58);
          hand.rotation.z = side * -0.025;
        };
        makeArm(-1);
        makeArm(1);

        const makeLeg = (side: -1 | 1) => {
          const hipX = side * 0.245;
          // 16/17 longer thighs with slight natural outward stance.
          const thigh = addMesh(new THREE.CapsuleGeometry(0.135, 0.92, 6, 12), suitSoft, `THIGH_${side}`, hipX, 1.48, 0.015, 1.03, 1, 0.94);
          thigh.rotation.z = side * 0.018;

          addMesh(new THREE.SphereGeometry(0.125, 14, 10), suitSoft, `KNEE_${side}`, hipX + side * 0.01, 0.88, 0.04, 0.90, 0.70, 0.90);

          // 18/19 tapered calf + ankle.
          const calf = addMesh(new THREE.CapsuleGeometry(0.105, 0.80, 6, 12), suitSoft, `CALF_${side}`, hipX + side * 0.018, 0.43, 0.035, 0.92, 1, 0.90);
          calf.rotation.z = side * -0.008;
          addMesh(new THREE.CylinderGeometry(0.065, 0.078, 0.20, 14), suitSoft, `ANKLE_${side}`, hipX + side * 0.018, -0.03, 0.05, 1, 1, 0.88);

          // 20 feet are longer and slightly toe-out so the stance reads human.
          const foot = addMesh(new THREE.BoxGeometry(0.25, 0.15, 0.58), shoe, `FOOT_${side}`, hipX + side * 0.025, -0.17, 0.17, 1, 1, 1);
          foot.rotation.y = side * 0.07;
        };
        makeLeg(-1);
        makeLeg(1);

        // Face-direction cues only; existing eyes and mouth remain untouched.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), skin);
        earL.scale.set(0.52, 1, 0.46);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.016, 0.022), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.06;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.06;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 10), skin);
        chin.scale.set(1.20, 0.52, 0.70);
        chin.position.set(0, -0.34, 0.34);
        headPivot.add(chin);
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

      const restore = () => { objectPrototype.add = originalAdd; };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => { disposed = true; };
  }, []);

  return null;
}
