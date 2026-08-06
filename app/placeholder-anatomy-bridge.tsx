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

      objectPrototype.add = function patchedAdd(...objects: import("three").Object3D[]) {
        const result = originalAdd.apply(this, objects);

        if (this.name === "PROCEDURAL_PLACEHOLDER_NOT_ISABEL") {
          for (const object of objects) {
            const isHeadPivot = object.children.length >= 3 && object.position.y > 3.5 && object.position.y < 4.2;
            if (!isHeadPivot) continue;
            if (this.children.some((child) => child.name === "HUMAN_PLACEHOLDER_V2")) continue;

            const rig = this;
            const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
            const suit = new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.58 });
            const suitSoft = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.64 });
            const shirt = new THREE.MeshStandardMaterial({ color: 0xe6e1da, roughness: 0.72 });
            const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
            const shoe = new THREE.MeshStandardMaterial({ color: 0x090a0c, roughness: 0.5 });

            // 01 hide the original oversized capsule torso.
            for (const child of rig.children) {
              if ((child as import("three").Mesh).isMesh && child !== object && Math.abs(child.position.y - 2.52) < 0.2) {
                child.visible = false;
              }
            }

            // 02 hide the original tube-limb groups.
            for (const child of rig.children) {
              if (child === object) continue;
              if ((child as import("three").Group).isGroup && child.children.some((grandchild) => (grandchild as import("three").Mesh).isMesh)) {
                if (child.position.y < 3.3) child.visible = false;
              }
            }

            // 03 shrink the oversized head to adult human proportions.
            object.scale.setScalar(0.84);
            // 04 raise the head so a real neck can exist below it.
            object.position.set(0, 4.48, 0.04);

            const human = new THREE.Group();
            human.name = "HUMAN_PLACEHOLDER_V2";
            rig.add(human);

            // 05 visible neck.
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.52, 24), skin);
            neck.name = "HUMAN_NECK";
            neck.position.set(0, 4.02, 0.0);
            human.add(neck);

            // 06 shoulder line wide enough to read as human anatomy.
            const shoulderLine = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.22, 0.46), suit);
            shoulderLine.position.set(0, 3.76, 0);
            human.add(shoulderLine);

            // 07 upper chest with narrower depth than width.
            const chest = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.92, 0.48), suit);
            chest.position.set(0, 3.35, 0);
            human.add(chest);

            // 08 tapered waist instead of an egg-shaped torso.
            const waist = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.42), suitSoft);
            waist.position.set(0, 2.63, 0.01);
            human.add(waist);

            // 09 pelvis/hip width restored below the waist.
            const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.48, 0.46), suitSoft);
            pelvis.position.set(0, 2.18, 0.02);
            human.add(pelvis);

            // 10 light shirt opening to break up the solid black capsule look.
            const shirtPanel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.025), shirt);
            shirtPanel.position.set(0, 3.42, 0.252);
            human.add(shirtPanel);

            // 11 left shoulder cap.
            const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), suit);
            shoulderL.scale.set(1.1, 0.8, 1.0);
            shoulderL.position.set(-0.68, 3.70, 0);
            human.add(shoulderL);

            // 12 right shoulder cap.
            const shoulderR = shoulderL.clone();
            shoulderR.position.x = 0.68;
            human.add(shoulderR);

            const makeArm = (side: -1 | 1) => {
              const shoulderX = side * 0.69;
              const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.64, 6, 12), suit);
              upper.position.set(shoulderX + side * 0.05, 3.20, 0.01);
              upper.rotation.z = side * -0.05;
              human.add(upper);

              const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), suit);
              elbow.position.set(shoulderX + side * 0.075, 2.76, 0.03);
              human.add(elbow);

              const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.58, 6, 12), suitSoft);
              forearm.position.set(shoulderX + side * 0.10, 2.35, 0.08);
              forearm.rotation.z = side * -0.035;
              forearm.rotation.x = -0.05;
              human.add(forearm);

              const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 5, 10), skin);
              hand.position.set(shoulderX + side * 0.115, 1.96, 0.11);
              human.add(hand);
            };

            // 13 articulated left arm: upper arm, elbow, forearm, hand.
            makeArm(-1);
            // 14 articulated right arm.
            makeArm(1);

            const makeLeg = (side: -1 | 1) => {
              const hipX = side * 0.25;
              const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.86, 6, 12), suitSoft);
              thigh.position.set(hipX, 1.55, 0.01);
              human.add(thigh);

              const knee = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10), suitSoft);
              knee.scale.set(0.9, 0.72, 0.9);
              knee.position.set(hipX, 1.00, 0.04);
              human.add(knee);

              const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.74, 6, 12), suitSoft);
              calf.position.set(hipX, 0.54, 0.035);
              human.add(calf);

              const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.52), shoe);
              foot.position.set(hipX, 0.07, 0.13);
              human.add(foot);
            };

            // 15 left thigh/knee/calf/foot chain.
            makeLeg(-1);
            // 16 right leg chain.
            makeLeg(1);

            // 17 ears make head yaw immediately readable.
            const earL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), skin);
            earL.scale.set(0.55, 1, 0.48);
            earL.position.set(-0.445, 0.01, 0.0);
            object.add(earL);
            const earR = earL.clone();
            earR.position.x = 0.445;
            object.add(earR);

            // 18 nose gives the face a clear forward direction.
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.17, 14), skin);
            nose.rotation.x = Math.PI / 2;
            nose.position.set(0, -0.025, 0.49);
            object.add(nose);

            // 19 brows improve eye direction readability without changing the mouth.
            const browL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.024), hair);
            browL.position.set(-0.17, 0.16, 0.445);
            browL.rotation.z = -0.06;
            object.add(browL);
            const browR = browL.clone();
            browR.position.x = 0.17;
            browR.rotation.z = 0.06;
            object.add(browR);

            // 20 jaw/chin cue makes pitch changes visible from the front and side.
            const chin = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 10), skin);
            chin.scale.set(1.25, 0.55, 0.72);
            chin.position.set(0, -0.34, 0.34);
            object.add(chin);

            // Preserve the existing mouth, eyes, bun, gaze target and viseme target exactly as built by Three.js.
          }
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
