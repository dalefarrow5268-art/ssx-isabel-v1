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
            const isHeadPivot = Math.abs(object.position.y - 3.79) < 0.12 && object.children.length >= 3;
            if (!isHeadPivot) continue;

            // 01 lift head for visible separation
            object.position.y = 3.98;
            // 02 move head slightly forward to create a readable neck silhouette
            object.position.z = 0.03;

            const alreadyEnhanced = this.children.some((child) => child.name === "PLACEHOLDER_NECK");
            if (alreadyEnhanced) continue;

            const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
            const suit = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.72 });

            // 03 visible neck
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.50, 24), skin);
            neck.name = "PLACEHOLDER_NECK";
            neck.position.set(0, 3.47, -0.015);
            this.add(neck);

            // 04 collar base
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 0.18, 24), suit);
            collar.name = "PLACEHOLDER_COLLAR";
            collar.position.set(0, 3.24, 0);
            this.add(collar);

            // 05 subtle left clavicle/shoulder cap
            const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), suit);
            shoulderL.scale.set(1.35, 0.55, 1.05);
            shoulderL.position.set(-0.43, 3.10, 0.02);
            this.add(shoulderL);

            // 06 subtle right clavicle/shoulder cap
            const shoulderR = shoulderL.clone();
            shoulderR.position.x = 0.43;
            this.add(shoulderR);

            // 07 add left ear to make yaw rotation readable
            const earL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skin);
            earL.scale.set(0.55, 1.0, 0.45);
            earL.position.set(-0.445, 0.01, 0.0);
            object.add(earL);

            // 08 add right ear
            const earR = earL.clone();
            earR.position.x = 0.445;
            object.add(earR);

            // 09 nose bridge
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 16), skin);
            nose.rotation.x = Math.PI / 2;
            nose.position.set(0, -0.015, 0.50);
            object.add(nose);

            // 10 chin volume
            const chin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), skin);
            chin.scale.set(1.2, 0.55, 0.72);
            chin.position.set(0, -0.35, 0.36);
            object.add(chin);

            // 11 jawline cue left
            const jawL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), skin);
            jawL.scale.set(1.1, 0.5, 0.75);
            jawL.position.set(-0.23, -0.29, 0.30);
            object.add(jawL);

            // 12 jawline cue right
            const jawR = jawL.clone();
            jawR.position.x = 0.23;
            object.add(jawR);

            // 13 eyebrow left for face orientation readability
            const browL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.018, 0.025), dark);
            browL.rotation.z = -0.06;
            browL.position.set(-0.17, 0.16, 0.445);
            object.add(browL);

            // 14 eyebrow right
            const browR = browL.clone();
            browR.rotation.z = 0.06;
            browR.position.x = 0.17;
            object.add(browR);

            // 15 cheek left
            const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), skin);
            cheekL.scale.set(1.0, 0.55, 0.55);
            cheekL.position.set(-0.22, -0.10, 0.37);
            object.add(cheekL);

            // 16 cheek right
            const cheekR = cheekL.clone();
            cheekR.position.x = 0.22;
            object.add(cheekR);

            // 17 upper neck shadow cue
            const neckShadow = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.022, 8, 24), dark);
            neckShadow.rotation.x = Math.PI / 2;
            neckShadow.position.set(0, 3.68, -0.015);
            this.add(neckShadow);

            // 18 lower collar seam cue
            const seam = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 8, 24), dark);
            seam.rotation.x = Math.PI / 2;
            seam.position.set(0, 3.31, 0.0);
            this.add(seam);

            // 19 shoulder taper bridge to reduce head-on-torso look
            const upperChest = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.34, 24), suit);
            upperChest.position.set(0, 3.02, 0.0);
            this.add(upperChest);

            // 20 small hairline cue so head yaw/pitch changes are easier to perceive
            const hairline = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 10, 28, Math.PI), dark);
            hairline.rotation.set(Math.PI / 2, 0, 0);
            hairline.position.set(0, 0.23, 0.30);
            object.add(hairline);
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
