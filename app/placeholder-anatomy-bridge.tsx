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
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V4")) return;

        const headPivot = rig.children.find((child) =>
          (child as import("three").Group).isGroup &&
          child.position.y > 3.5 &&
          child.position.y < 4.2 &&
          child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.57 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x191c22, roughness: 0.64 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0xe8e3dc, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.42 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        // Preserve the working facial controls, but rebalance the head against the body.
        headPivot.scale.setScalar(0.74);
        headPivot.position.set(0, 4.62, 0.045);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V4";
        originalAdd.call(rig, human);

        const addMesh = (
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
          human.add(mesh);
          return mesh;
        };

        // 01 slim visible neck with a gentle taper.
        addMesh(new THREE.CylinderGeometry(0.14, 0.17, 0.48, 24), skin, "HUMAN_NECK", 0, 4.18, 0, 1, 1, 0.92);

        // 02-07 one continuous torso profile instead of stacked chest/waist/hip bubbles.
        const torsoProfile = [
          new THREE.Vector2(0.34, 0.00),
          new THREE.Vector2(0.41, 0.18),
          new THREE.Vector2(0.46, 0.38),
          new THREE.Vector2(0.42, 0.58),
          new THREE.Vector2(0.34, 0.82),
          new THREE.Vector2(0.36, 1.05),
          new THREE.Vector2(0.43, 1.30),
          new THREE.Vector2(0.50, 1.56),
          new THREE.Vector2(0.53, 1.78),
          new THREE.Vector2(0.44, 1.94),
        ];
        const torso = addMesh(new THREE.LatheGeometry(torsoProfile, 32), suit, "CONTINUOUS_TORSO", 0, 2.02, 0.0, 1.0, 1.0, 0.54);
        torso.rotation.y = Math.PI / 2;

        // 08 subtle shoulder slope, much smaller than the previous shoulder tube.
        const shoulder = addMesh(new THREE.CapsuleGeometry(0.14, 0.82, 6, 18), suit, "SHOULDER_BRIDGE", 0, 3.91, -0.005, 1, 1, 0.86);
        shoulder.rotation.z = Math.PI / 2;

        // 09 small shirt opening to keep front/back orientation readable.
        addMesh(new THREE.PlaneGeometry(0.20, 0.58), shirt, "SHIRT_PANEL", 0, 3.46, 0.291, 1, 1, 1);

        // 10 low-profile shoulder caps so arms connect without bowling-ball joints.
        addMesh(new THREE.SphereGeometry(0.14, 18, 12), suit, "SHOULDER_L", -0.54, 3.82, 0, 1.05, 0.80, 0.92);
        addMesh(new THREE.SphereGeometry(0.14, 18, 12), suit, "SHOULDER_R", 0.54, 3.82, 0, 1.05, 0.80, 0.92);

        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.56;
          // 11 upper arm: slimmer and slightly relaxed away from the torso.
          const upper = addMesh(new THREE.CapsuleGeometry(0.082, 0.67, 6, 12), suit, `UPPER_ARM_${side}`, shoulderX + side * 0.045, 3.27, 0.015, 0.95, 1, 0.92);
          upper.rotation.z = side * -0.085;
          upper.rotation.x = -0.03;

          // 12 elbow reduced in size.
          addMesh(new THREE.SphereGeometry(0.086, 14, 10), suit, `ELBOW_${side}`, shoulderX + side * 0.082, 2.80, 0.035, 0.92, 0.78, 0.92);

          // 13 forearm: visibly tapered.
          const fore = addMesh(new THREE.CapsuleGeometry(0.067, 0.60, 6, 12), suitSoft, `FOREARM_${side}`, shoulderX + side * 0.105, 2.38, 0.07, 0.90, 1, 0.86);
          fore.rotation.z = side * -0.055;
          fore.rotation.x = -0.07;

          // 14 wrist transition.
          addMesh(new THREE.CylinderGeometry(0.047, 0.060, 0.15, 14), skin, `WRIST_${side}`, shoulderX + side * 0.125, 2.02, 0.09, 1, 1, 0.84);

          // 15 hand/palm enlarged enough to read as a hand.
          const hand = addMesh(new THREE.CapsuleGeometry(0.068, 0.24, 5, 10), skin, `HAND_${side}`, shoulderX + side * 0.135, 1.80, 0.105, 0.84, 1, 0.55);
          hand.rotation.z = side * -0.02;
        };
        makeArm(-1);
        makeArm(1);

        const makeLeg = (side: -1 | 1) => {
          const hipX = side * 0.215;
          // 16 thigh: slightly fuller at top, long enough for adult proportions.
          const thigh = addMesh(new THREE.CapsuleGeometry(0.118, 0.96, 6, 12), suitSoft, `THIGH_${side}`, hipX, 1.43, 0.01, 1.02, 1, 0.92);
          thigh.rotation.z = side * 0.012;

          // 17 knee smaller and less ring-like.
          addMesh(new THREE.SphereGeometry(0.103, 14, 10), suitSoft, `KNEE_${side}`, hipX + side * 0.008, 0.82, 0.035, 0.88, 0.66, 0.88);

          // 18 calf long and tapered.
          const calf = addMesh(new THREE.CapsuleGeometry(0.088, 0.82, 6, 12), suitSoft, `CALF_${side}`, hipX + side * 0.014, 0.34, 0.035, 0.92, 1, 0.86);
          calf.rotation.z = side * -0.007;

          // 19 ankle.
          addMesh(new THREE.CylinderGeometry(0.052, 0.065, 0.19, 14), suitSoft, `ANKLE_${side}`, hipX + side * 0.016, -0.14, 0.05, 1, 1, 0.84);

          // 20 realistic shoe length and slight toe-out.
          const foot = addMesh(new THREE.BoxGeometry(0.22, 0.14, 0.55), shoe, `FOOT_${side}`, hipX + side * 0.022, -0.28, 0.18);
          foot.rotation.y = side * 0.055;
        };
        makeLeg(-1);
        makeLeg(1);

        // Keep face-direction cues minimal; do not alter eyes or mouth geometry.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), skin);
        earL.scale.set(0.50, 1, 0.44);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.047, 0.15, 14), skin);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.025, 0.49);
        headPivot.add(nose);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.015, 0.021), hair);
        browL.position.set(-0.17, 0.16, 0.445);
        browL.rotation.z = -0.06;
        headPivot.add(browL);
        const browR = browL.clone();
        browR.position.x = 0.17;
        browR.rotation.z = 0.06;
        headPivot.add(browR);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 10), skin);
        chin.scale.set(1.18, 0.50, 0.68);
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
