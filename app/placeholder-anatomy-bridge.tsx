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
        const suit = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.56 });
        const suitSoft = new THREE.MeshStandardMaterial({ color: 0x1b1e25, roughness: 0.64 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0xe8e3dc, roughness: 0.72 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.42 });

        for (const child of rig.children) {
          if (child === headPivot) continue;
          if ((child as import("three").Mesh).isMesh || (child as import("three").Group).isGroup) child.visible = false;
        }

        // Keep the working face, but reduce the bobble-head read and shorten the exposed neck.
        headPivot.scale.setScalar(0.76);
        headPivot.position.set(0, 4.50, 0.055);

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

        // 01 shorter, slimmer neck.
        addMesh(new THREE.CylinderGeometry(0.145, 0.18, 0.38, 24), skin, "HUMAN_NECK", 0, 4.11, 0, 1, 1, 0.92);

        // 02 clavicle bridge: flatter and narrower than the prior shoulder tube.
        const clavicle = addMesh(new THREE.CapsuleGeometry(0.15, 0.78, 6, 18), suit, "CLAVICLE_BRIDGE", 0, 3.91, 0, 1, 1, 1.08);
        clavicle.rotation.z = Math.PI / 2;

        // 03 upper torso: wider chest, much less spherical depth.
        addMesh(new THREE.SphereGeometry(0.56, 28, 20), suit, "UPPER_TORSO", 0, 3.54, 0.015, 1.04, 0.79, 0.43);

        // 04 mid torso: overlaps the upper torso to create a continuous silhouette.
        addMesh(new THREE.SphereGeometry(0.50, 28, 20), suit, "MID_TORSO", 0, 3.12, 0.01, 0.94, 0.76, 0.42);

        // 05 waist: less pinched than before so it reads anatomical, not corseted.
        addMesh(new THREE.CylinderGeometry(0.37, 0.41, 0.52, 24), suitSoft, "WAIST", 0, 2.74, 0.015, 1, 1, 0.60);

        // 06 pelvis: wider but shallower to avoid the bubble-hip look.
        addMesh(new THREE.SphereGeometry(0.50, 28, 20), suitSoft, "PELVIS", 0, 2.34, 0.025, 1.02, 0.52, 0.46);

        // 07 lower pelvis connector creates one torso-to-leg transition.
        addMesh(new THREE.CylinderGeometry(0.39, 0.34, 0.30, 24), suitSoft, "LOWER_PELVIS", 0, 2.08, 0.02, 1, 1, 0.60);

        // 08 front-direction shirt cue without changing the face/mouth system.
        const shirtPanel = addMesh(new THREE.PlaneGeometry(0.22, 0.64), shirt, "SHIRT_PANEL", 0, 3.43, 0.273);
        shirtPanel.position.z = 0.274;

        // 09/10 shoulders are smaller and lower; no more ball-joint look.
        addMesh(new THREE.SphereGeometry(0.135, 18, 12), suit, "SHOULDER_L", -0.56, 3.78, 0, 1.10, 0.82, 0.95);
        addMesh(new THREE.SphereGeometry(0.135, 18, 12), suit, "SHOULDER_R", 0.56, 3.78, 0, 1.10, 0.82, 0.95);

        const makeArm = (side: -1 | 1) => {
          const shoulderX = side * 0.565;

          // 11 upper arm slopes inward and slightly forward.
          const upper = addMesh(new THREE.CapsuleGeometry(0.088, 0.63, 6, 12), suit, `UPPER_ARM_${side}`, shoulderX + side * 0.055, 3.24, 0.03, 0.98, 1, 0.92);
          upper.rotation.z = side * -0.13;
          upper.rotation.x = -0.04;

          // 12 smaller elbow, offset a touch forward.
          addMesh(new THREE.SphereGeometry(0.088, 14, 10), suit, `ELBOW_${side}`, shoulderX + side * 0.11, 2.80, 0.055, 0.90, 0.76, 0.90);

          // 13 forearm slightly angled instead of perfectly vertical.
          const fore = addMesh(new THREE.CapsuleGeometry(0.072, 0.56, 6, 12), suitSoft, `FOREARM_${side}`, shoulderX + side * 0.145, 2.39, 0.10, 0.96, 1, 0.90);
          fore.rotation.z = side * -0.08;
          fore.rotation.x = -0.085;

          // 14 wrist a little thicker so the hand does not look detached.
          addMesh(new THREE.CylinderGeometry(0.058, 0.068, 0.16, 14), skin, `WRIST_${side}`, shoulderX + side * 0.17, 2.05, 0.12, 1, 1, 0.90);

          // 15 palm proportion increased slightly.
          const hand = addMesh(new THREE.CapsuleGeometry(0.078, 0.23, 5, 10), skin, `HAND_${side}`, shoulderX + side * 0.185, 1.83, 0.135, 0.90, 1, 0.62);
          hand.rotation.z = side * -0.04;
        };
        makeArm(-1);
        makeArm(1);

        const makeLeg = (side: -1 | 1) => {
          const hipX = side * 0.235;

          // 16 thigh widened slightly at the hip and kept close enough to read as one pelvis.
          const thigh = addMesh(new THREE.CapsuleGeometry(0.145, 0.90, 6, 12), suitSoft, `THIGH_${side}`, hipX, 1.51, 0.02, 1.00, 1, 0.94);
          thigh.rotation.z = side * 0.014;

          // 17 knee kept subtle.
          addMesh(new THREE.SphereGeometry(0.118, 14, 10), suitSoft, `KNEE_${side}`, hipX + side * 0.008, 0.92, 0.045, 0.90, 0.70, 0.90);

          // 18 calf significantly thicker than the previous needle-like version.
          const calf = addMesh(new THREE.CapsuleGeometry(0.118, 0.78, 6, 12), suitSoft, `CALF_${side}`, hipX + side * 0.015, 0.48, 0.04, 1.00, 1, 0.94);
          calf.rotation.z = side * -0.008;

          // 19 ankle widened and shortened.
          addMesh(new THREE.CylinderGeometry(0.078, 0.086, 0.18, 14), suitSoft, `ANKLE_${side}`, hipX + side * 0.015, 0.04, 0.055, 1, 1, 0.92);

          // 20 feet widened to support the silhouette and stance.
          const foot = addMesh(new THREE.BoxGeometry(0.29, 0.16, 0.58), shoe, `FOOT_${side}`, hipX + side * 0.025, -0.12, 0.18);
          foot.rotation.y = side * 0.06;
        };
        makeLeg(-1);
        makeLeg(1);

        // Preserve existing eyes/mouth; only add orientation cues.
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 10), skin);
        earL.scale.set(0.52, 1, 0.46);
        earL.position.set(-0.445, 0.01, 0);
        headPivot.add(earL);
        const earR = earL.clone();
        earR.position.x = 0.445;
        headPivot.add(earR);

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
      };
      window.addEventListener("pagehide", restore, { once: true });
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
