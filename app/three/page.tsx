"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./three.module.css";

type MotionState = "idle" | "notice" | "walk" | "present" | "return";

const labels: Record<MotionState, string> = {
  idle: "Working at desk",
  notice: "Noticing the user",
  walk: "Walking to evidence wall",
  present: "Presenting evidence",
  return: "Returning to desk",
};

export default function ThreeMotionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MotionState>("idle");

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1118);
      scene.fog = new THREE.Fog(0x0b1118, 10, 24);

      const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 4.7, 10.8);
      camera.lookAt(0, 2.1, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xd8ebff, 0x202934, 2.2);
      scene.add(ambient);
      const key = new THREE.DirectionalLight(0xffffff, 3.4);
      key.position.set(4, 8, 5);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.PointLight(0x5dc7ff, 18, 16);
      rim.position.set(-5, 4, -3);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 12),
        new THREE.MeshStandardMaterial({ color: 0x17202a, roughness: 0.82, metalness: 0.12 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(14, 6, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x17212b, roughness: 0.7 })
      );
      backWall.position.set(0, 3, -4.2);
      scene.add(backWall);

      const monitorMaterial = new THREE.MeshStandardMaterial({ color: 0x123848, emissive: 0x0d5871, emissiveIntensity: 1.4 });
      for (let i = -1; i <= 1; i++) {
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.45, 0.12), monitorMaterial.clone());
        monitor.position.set(i * 2.9, 3.55, -4.0);
        scene.add(monitor);
      }

      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.22, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x5d4633, roughness: 0.52 })
      );
      desk.position.set(0, 1.15, 2.1);
      desk.castShadow = true;
      scene.add(desk);

      const rig = new THREE.Group();
      scene.add(rig);

      const skin = new THREE.MeshStandardMaterial({ color: 0xb9775f, roughness: 0.58 });
      const suit = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.66 });
      const hair = new THREE.MeshStandardMaterial({ color: 0x251813, roughness: 0.8 });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.25, 8, 16), suit);
      torso.position.y = 2.5;
      torso.castShadow = true;
      rig.add(torso);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.28, 18), skin);
      neck.position.y = 3.35;
      rig.add(neck);

      const headPivot = new THREE.Group();
      headPivot.position.y = 3.78;
      rig.add(headPivot);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), skin);
      head.scale.set(0.88, 1.08, 0.9);
      head.castShadow = true;
      headPivot.add(head);

      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 18), hair);
      bun.position.set(0, 0.35, -0.25);
      headPivot.add(bun);

      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
      hairCap.position.set(0, 0.08, -0.03);
      hairCap.rotation.x = -0.05;
      headPivot.add(hairCap);

      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.2 });
      const eyes: THREE.Mesh[] = [];
      [-0.17, 0.17].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMaterial);
        eye.position.set(x, 0.06, 0.43);
        headPivot.add(eye);
        eyes.push(eye);
      });

      const leftArm = new THREE.Group();
      const rightArm = new THREE.Group();
      leftArm.position.set(-0.72, 2.9, 0);
      rightArm.position.set(0.72, 2.9, 0);
      rig.add(leftArm, rightArm);

      function limb(group: THREE.Group) {
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.72, 6, 12), suit);
        upper.position.y = -0.5;
        group.add(upper);
        const lowerPivot = new THREE.Group();
        lowerPivot.position.y = -0.95;
        group.add(lowerPivot);
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.62, 6, 12), suit);
        lower.position.y = -0.4;
        lowerPivot.add(lower);
        return lowerPivot;
      }
      const leftForearm = limb(leftArm);
      const rightForearm = limb(rightArm);

      const leftLeg = new THREE.Group();
      const rightLeg = new THREE.Group();
      leftLeg.position.set(-0.28, 1.7, 0);
      rightLeg.position.set(0.28, 1.7, 0);
      rig.add(leftLeg, rightLeg);
      function leg(group: THREE.Group) {
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.88, 6, 12), suit);
        upper.position.y = -0.55;
        group.add(upper);
        const knee = new THREE.Group();
        knee.position.y = -1.05;
        group.add(knee);
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.82, 6, 12), suit);
        lower.position.y = -0.5;
        knee.add(lower);
        return knee;
      }
      const leftKnee = leg(leftLeg);
      const rightKnee = leg(rightLeg);

      rig.position.set(0, 0, 1.15);
      rig.rotation.y = Math.PI;

      const clock = new THREE.Clock();
      let frame = 0;
      let activeState: MotionState = "idle";
      const stateListener = (event: Event) => {
        activeState = (event as CustomEvent<MotionState>).detail;
      };
      window.addEventListener("isabel-three-state", stateListener);

      const resize = () => {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", resize);

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const breathe = Math.sin(t * 1.7) * 0.025;
        torso.scale.y = 1 + breathe;

        const blink = Math.sin(t * 2.3) > 0.985 ? 0.18 : 1;
        eyes.forEach((eye) => (eye.scale.y = blink));

        leftArm.rotation.z *= 0.9;
        rightArm.rotation.z *= 0.9;
        leftArm.rotation.x *= 0.9;
        rightArm.rotation.x *= 0.9;
        leftLeg.rotation.x *= 0.8;
        rightLeg.rotation.x *= 0.8;
        leftKnee.rotation.x *= 0.8;
        rightKnee.rotation.x *= 0.8;

        if (activeState === "idle") {
          rig.position.x += (0 - rig.position.x) * 0.03;
          rig.position.z += (1.15 - rig.position.z) * 0.03;
          rig.rotation.y += (Math.PI - rig.rotation.y) * 0.04;
          headPivot.rotation.y = Math.sin(t * 0.55) * 0.08;
          leftForearm.rotation.x = -1.0 + Math.sin(t * 3) * 0.08;
          rightForearm.rotation.x = -1.0 - Math.sin(t * 3) * 0.08;
        } else if (activeState === "notice") {
          headPivot.rotation.y += (0.65 - headPivot.rotation.y) * 0.08;
          headPivot.rotation.x = -0.08;
        } else if (activeState === "walk") {
          const destinationX = -2.6;
          rig.position.x += (destinationX - rig.position.x) * 0.012;
          rig.position.z += (-1.25 - rig.position.z) * 0.012;
          rig.rotation.y += (0.1 - rig.rotation.y) * 0.035;
          const stride = Math.sin(t * 7.4) * 0.72;
          leftLeg.rotation.x = stride;
          rightLeg.rotation.x = -stride;
          leftKnee.rotation.x = Math.max(0, -stride) * 0.55;
          rightKnee.rotation.x = Math.max(0, stride) * 0.55;
          leftArm.rotation.x = -stride * 0.55;
          rightArm.rotation.x = stride * 0.55;
          rig.position.y = Math.abs(Math.sin(t * 7.4)) * 0.04;
        } else if (activeState === "present") {
          rig.position.x += (-2.6 - rig.position.x) * 0.04;
          rig.position.z += (-1.25 - rig.position.z) * 0.04;
          rig.rotation.y += (0.1 - rig.rotation.y) * 0.05;
          headPivot.rotation.y += (0.15 - headPivot.rotation.y) * 0.05;
          rightArm.rotation.z = -0.72;
          rightArm.rotation.x = -0.35;
          rightForearm.rotation.x = -0.75;
        } else if (activeState === "return") {
          rig.position.x += (0 - rig.position.x) * 0.014;
          rig.position.z += (1.15 - rig.position.z) * 0.014;
          rig.rotation.y += (Math.PI - rig.rotation.y) * 0.03;
          const stride = Math.sin(t * 7.2) * 0.68;
          leftLeg.rotation.x = stride;
          rightLeg.rotation.x = -stride;
          leftArm.rotation.x = -stride * 0.5;
          rightArm.rotation.x = stride * 0.5;
        }

        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("isabel-three-state", stateListener);
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-three-state", { detail: state }));
  }, [state]);

  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div ref={mountRef} className={styles.canvas} />
        <aside className={styles.panel}>
          <span>ISABEL · REAL-TIME 3D MOTION PROOF</span>
          <h1>{labels[state]}</h1>
          <p>This is a code-driven skeletal character moving through a measured virtual office. It is the runtime foundation that the final identity-locked Isabel model will replace.</p>
          <div className={styles.buttons}>
            {(["idle", "notice", "walk", "present", "return"] as MotionState[]).map((item) => (
              <button key={item} className={state === item ? styles.active : ""} onClick={() => setState(item)}>
                {labels[item]}
              </button>
            ))}
          </div>
          <dl>
            <div><dt>Renderer</dt><dd>Three.js WebGL</dd></div>
            <div><dt>Movement</dt><dd>real-time bone transforms</dd></div>
            <div><dt>Scene</dt><dd>fixed 3D coordinates</dd></div>
            <div><dt>Next asset</dt><dd>identity-locked Isabel GLB</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
