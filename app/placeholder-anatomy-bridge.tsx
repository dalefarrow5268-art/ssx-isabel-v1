"use client";

import { useEffect } from "react";

export default function IsabelPlaceholderAnatomyBridge() {
  useEffect(() => {
    let disposed = false;
    let idleFrame = 0;

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const objectPrototype = THREE.Object3D.prototype;
      const originalAdd = objectPrototype.add;
      const pending = new WeakSet<import("three").Object3D>();

      const enhanceRig = (rig: import("three").Object3D) => {
        if (disposed || rig.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V5")) return;

        const headPivot = rig.children.find((child) =>
          (child as import("three").Group).isGroup &&
          child.position.y > 3.5 &&
          child.position.y < 4.2 &&
          child.children.length >= 3,
        );
        if (!headPivot) return;

        const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
        const suit = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.58 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.64 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0xe9e3dc, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.44 });

        // Remove every old placeholder body part while preserving the working head pivot.
        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        // Better adult head/body ratio and less exposed neck.
        headPivot.scale.setScalar(0.74);
        headPivot.position.set(0, 4.43, 0.055);

        const human = new THREE.Group();
        human.name = "HUMAN_PLACEHOLDER_V5";
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

        // 01 neck: shorter and slightly tapered.
        addMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.34, 24), skin, "HUMAN_NECK", 0, 4.08, 0, 1, 1, 0.92);

        // 02 upper torso: tapered frustum instead of a sphere/bubble.
        addMesh(new THREE.CylinderGeometry(0.50, 0.37, 0.86, 28), suit, "CHEST_TAPER", 0, 3.57, 0.01, 1, 1, 0.60);

        // 03 waist bridge: overlaps chest and pelvis so the silhouette is continuous.
        addMesh(new THREE.CylinderGeometry(0.37, 0.39, 0.46, 28), suitSoft, "WAIST_BRIDGE", 0, 2.93, 0.015, 1, 1, 0.60);

        // 04 pelvis: shallow taper, not a round hip bubble.
        addMesh(new THREE.CylinderGeometry(0.39, 0.45, 0.54, 28), suitSoft, "PELVIS_TAPER", 0, 2.45, 0.02, 1, 1, 0.62);

        // 05 subtle side hip volume only, kept shallow front-to-back.
        addMesh(new THREE.SphereGeometry(0.18, 18, 12), suitSoft, "HIP_L", -0.38, 2.34, 0.02, 1.0, 1.25, 0.62);
        addMesh(new THREE.SphereGeometry(0.18, 18, 12), suitSoft, "HIP_R", 0.38, 2.34, 0.02, 1.0, 1.25, 0.62);

        // 06 short lower pelvis connector that meets the thighs.
        addMesh(new THREE.CylinderGeometry(0.41, 0.34, 0.30, 28), suitSoft, "LOWER_PELVIS", 0, 2.09, 0.02, 1, 1, 0.60);

        // 07 shirt opening gives a clear front direction without changing the face system.
        addMesh(new THREE.PlaneGeometry(0.20, 0.58), shirt, "SHIRT_PANEL", 0, 3.55, 0.315);

        const makeArm = (side: -1 | 1) => {
          const x = side * 0.515;

          // 08 shoulder connection is built into the arm; no ball-joint spheres.
          const upper = addMesh(new THREE.CapsuleGeometry(0.09, 0.62, 6, 12), suit, `UPPER_ARM_${side}`, x + side * 0.045, 3.37, 0.035, 0.98, 1, 0.92);
          upper.rotation.z = side * -0.16;
          upper.rotation.x = -0.055;

          // 09 compact elbow.
          addMesh(new THREE.SphereGeometry(0.082, 14, 10), suit, `ELBOW_${side}`, x + side * 0.11, 2.92, 0.065, 0.88, 0.72, 0.88);

          // 10 forearm angles inward and forward for a relaxed stance.
          const fore = addMesh(new THREE.CapsuleGeometry(0.073, 0.56, 6, 12), suitSoft, `FOREARM_${side}`, x + side * 0.145, 2.50, 0.115, 0.96, 1, 0.90);
          fore.rotation.z = side * -0.085;
          fore.rotation.x = -0.10;

          // 11 wrist connection.
          addMesh(new THREE.CylinderGeometry(0.058, 0.067, 0.15, 14), skin, `WRIST_${side}`, x + side * 0.17, 2.16, 0.14, 1, 1, 0.90);

          // 12 hand: wider palm, slightly flattened depth.
          const hand = addMesh(new THREE.CapsuleGeometry(0.079, 0.23, 5, 10), skin, `HAND_${side}`, x + side * 0.185, 1.94, 0.155, 0.92, 1, 0.62);
          hand.rotation.z = side * -0.05;
        };
        makeArm(-1);
        makeArm(1);

        const makeLeg = (side: -1 | 1) => {
          const x = side * 0.225;

          // 13 thigh with enough volume to meet the pelvis naturally.
          const thigh = addMesh(new THREE.CapsuleGeometry(0.145, 0.88, 6, 12), suitSoft, `THIGH_${side}`, x, 1.53, 0.02, 1.02, 1, 0.95);
          thigh.rotation.z = side * 0.012;

          // 14 small knee transition.
          addMesh(new THREE.SphereGeometry(0.117, 14, 10), suitSoft, `KNEE_${side}`, x + side * 0.006, 0.96, 0.045, 0.90, 0.68, 0.90);

          // 15 calf: visibly thicker than the ankle and not needle-like.
          const calf = addMesh(new THREE.CapsuleGeometry(0.125, 0.74, 6, 12), suitSoft, `CALF_${side}`, x + side * 0.012, 0.53, 0.04, 1.0, 1, 0.94);
          calf.rotation.z = side * -0.006;

          // 16 ankle shortened and widened.
          addMesh(new THREE.CylinderGeometry(0.082, 0.09, 0.17, 14), suitSoft, `ANKLE_${side}`, x + side * 0.012, 0.10, 0.055, 1, 1, 0.92);

          // 17 foot: proportional width/length with slight toe-out.
          const foot = addMesh(new THREE.BoxGeometry(0.30, 0.16, 0.58), shoe, `FOOT_${side}`, x + side * 0.024, -0.06, 0.19);
          foot.rotation.y = side * 0.055;
        };
        makeLeg(-1);
        makeLeg(1);

        // 18 ear cues make head rotation readable.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 10), skin);
        earL.scale.set(0.52, 1, 0.46);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

        // 19 nose/brow/chin orientation cues; existing eyes and mouth remain untouched.
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.15, 14), skin);
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

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 10), skin);
        chin.scale.set(1.18, 0.50, 0.68);
        chin.position.set(0, -0.34, 0.34);
        headPivot.add(chin);

        // 20 idle life goes on the new body, not the old hidden capsule torso.
        const baseHeadY = headPivot.position.y;
        const animateIdle = () => {
          if (disposed) return;
          const t = performance.now() * 0.001;
          human.scale.y = 1 + Math.sin(t * 1.6) * 0.0045;
          human.rotation.z = Math.sin(t * 0.62) * 0.004;
          human.position.x = Math.sin(t * 0.48) * 0.008;
          headPivot.position.y = baseHeadY + Math.sin(t * 1.6) * 0.006;
          idleFrame = window.requestAnimationFrame(animateIdle);
        };
        idleFrame = window.requestAnimationFrame(animateIdle);
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
