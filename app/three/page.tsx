"use client";

import { useEffect, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import styles from "./three.module.css";

type MotionState =
  | "working"
  | "notice"
  | "stand"
  | "walk"
  | "present"
  | "listen"
  | "return"
  | "sit";

const sequence: Array<{ state: MotionState; ms: number }> = [
  { state: "working", ms: 3200 },
  { state: "notice", ms: 1600 },
  { state: "stand", ms: 1600 },
  { state: "walk", ms: 5200 },
  { state: "present", ms: 4300 },
  { state: "listen", ms: 2600 },
  { state: "return", ms: 5200 },
  { state: "sit", ms: 1800 },
];

const labels: Record<MotionState, string> = {
  working: "Working at the desk",
  notice: "Noticing the user",
  stand: "Standing from the chair",
  walk: "Walking to the evidence wall",
  present: "Presenting linked evidence",
  listen: "Listening for direction",
  return: "Returning to the desk",
  sit: "Sitting and resuming work",
};

const speechStates = new Set<MotionState>(["present"]);

export default function ThreeMotionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const state = sequence[index].state;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % sequence.length),
      sequence[index].ms,
    );
    return () => window.clearTimeout(timer);
  }, [index, running]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-three-state", { detail: state }));
  }, [state]);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x091018);
      scene.fog = new THREE.Fog(0x091018, 10, 25);

      const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 4.8, 11.2);
      camera.lookAt(0, 2.1, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xd9ecff, 0x202934, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 3.5);
      key.position.set(4, 8, 5);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.PointLight(0x60c9ff, 18, 16);
      rim.position.set(-5, 4, -3);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 12),
        new THREE.MeshStandardMaterial({ color: 0x17202a, roughness: 0.82, metalness: 0.12 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(14, 6, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x17212b, roughness: 0.7 }),
      );
      backWall.position.set(0, 3, -4.2);
      scene.add(backWall);

      const monitorMaterials = [-1, 0, 1].map(
        () => new THREE.MeshStandardMaterial({ color: 0x123848, emissive: 0x0d5871, emissiveIntensity: 1.15 }),
      );
      const monitors: Mesh[] = [];
      for (let i = -1; i <= 1; i++) {
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.45, 0.12), monitorMaterials[i + 1]);
        monitor.position.set(i * 2.9, 3.55, -4.0);
        scene.add(monitor);
        monitors.push(monitor);
      }

      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.22, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x5d4633, roughness: 0.52 }),
      );
      desk.position.set(0, 1.15, 2.1);
      desk.castShadow = true;
      scene.add(desk);

      const chair = new THREE.Group();
      const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.72 });
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.0), chairMaterial);
      chairSeat.position.y = 0.76;
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.18), chairMaterial);
      chairBack.position.set(0, 1.45, 0.42);
      chair.add(chairSeat, chairBack);
      chair.position.set(0, 0, 1.45);
      scene.add(chair);

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
      headPivot.add(hairCap);

      const eyes: Mesh[] = [];
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.2 });
      [-0.17, 0.17].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMaterial);
        eye.position.set(x, 0.06, 0.43);
        headPivot.add(eye);
        eyes.push(eye);
      });
      const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.23, 0.035, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x5f2424, roughness: 0.5 }),
      );
      mouth.position.set(0, -0.17, 0.43);
      headPivot.add(mouth);

      const makeLimb = (group: Group, radius: number, length: number) => {
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), suit);
        upper.position.y = -0.5;
        group.add(upper);
        const joint = new THREE.Group();
        joint.position.y = -0.95;
        group.add(joint);
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.86, length * 0.86, 6, 12), suit);
        lower.position.y = -0.4;
        joint.add(lower);
        return joint;
      };

      const leftArm = new THREE.Group();
      const rightArm = new THREE.Group();
      leftArm.position.set(-0.72, 2.9, 0);
      rightArm.position.set(0.72, 2.9, 0);
      rig.add(leftArm, rightArm);
      const leftForearm = makeLimb(leftArm, 0.15, 0.72);
      const rightForearm = makeLimb(rightArm, 0.15, 0.72);

      const leftLeg = new THREE.Group();
      const rightLeg = new THREE.Group();
      leftLeg.position.set(-0.28, 1.7, 0);
      rightLeg.position.set(0.28, 1.7, 0);
      rig.add(leftLeg, rightLeg);
      const leftKnee = makeLimb(leftLeg, 0.19, 0.88);
      const rightKnee = makeLimb(rightLeg, 0.19, 0.88);

      rig.position.set(0, -0.72, 1.1);
      rig.rotation.y = 0;

      const clock = new THREE.Clock();
      let frame = 0;
      let activeState: MotionState = state;
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

      const approach = (current: number, target: number, speed: number) => current + (target - current) * speed;

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const seated = activeState === "working" || activeState === "notice" || activeState === "sit";
        const speaking = speechStates.has(activeState);

        torso.scale.y = 1 + Math.sin(t * 1.7) * 0.025;
        eyes.forEach((eye) => (eye.scale.y = Math.sin(t * 2.3) > 0.985 ? 0.18 : 1));
        mouth.scale.y = speaking ? 0.5 + Math.abs(Math.sin(t * 8.7)) * 1.8 : 0.25;

        monitors.forEach((monitor, monitorIndex) => {
          const material = monitor.material as import("three").MeshStandardMaterial;
          material.emissiveIntensity = activeState === "present" && monitorIndex === 0 ? 3.6 : 1.15;
        });

        leftArm.rotation.z *= 0.88;
        rightArm.rotation.z *= 0.88;
        leftArm.rotation.x *= 0.86;
        rightArm.rotation.x *= 0.86;
        leftLeg.rotation.x *= 0.78;
        rightLeg.rotation.x *= 0.78;
        leftKnee.rotation.x *= 0.78;
        rightKnee.rotation.x *= 0.78;
        headPivot.rotation.x *= 0.9;
        headPivot.rotation.y *= 0.9;

        if (activeState === "working") {
          rig.position.x = approach(rig.position.x, 0, 0.04);
          rig.position.z = approach(rig.position.z, 1.1, 0.04);
          rig.position.y = approach(rig.position.y, -0.72, 0.05);
          rig.rotation.y = approach(rig.rotation.y, 0, 0.05);
          leftLeg.rotation.x = -1.15;
          rightLeg.rotation.x = -1.15;
          leftKnee.rotation.x = 1.55;
          rightKnee.rotation.x = 1.55;
          leftForearm.rotation.x = -1.0 + Math.sin(t * 4.2) * 0.09;
          rightForearm.rotation.x = -1.0 - Math.sin(t * 4.2) * 0.09;
          headPivot.rotation.y = Math.sin(t * 0.55) * 0.06;
        } else if (activeState === "notice") {
          rig.position.y = approach(rig.position.y, -0.72, 0.05);
          leftLeg.rotation.x = -1.15;
          rightLeg.rotation.x = -1.15;
          leftKnee.rotation.x = 1.55;
          rightKnee.rotation.x = 1.55;
          headPivot.rotation.y = approach(headPivot.rotation.y, 0, 0.08);
          headPivot.rotation.x = approach(headPivot.rotation.x, -0.08, 0.08);
        } else if (activeState === "stand") {
          rig.position.y = approach(rig.position.y, 0, 0.055);
          leftLeg.rotation.x = approach(leftLeg.rotation.x, 0, 0.08);
          rightLeg.rotation.x = approach(rightLeg.rotation.x, 0, 0.08);
          leftKnee.rotation.x = approach(leftKnee.rotation.x, 0, 0.08);
          rightKnee.rotation.x = approach(rightKnee.rotation.x, 0, 0.08);
        } else if (activeState === "walk" || activeState === "return") {
          const returning = activeState === "return";
          const targetX = returning ? 0 : -2.6;
          const targetZ = returning ? 1.1 : -1.25;
          const dx = targetX - rig.position.x;
          const dz = targetZ - rig.position.z;
          const targetFacing = Math.atan2(dx, dz);
          rig.position.x = approach(rig.position.x, targetX, 0.014);
          rig.position.z = approach(rig.position.z, targetZ, 0.014);
          rig.position.y = Math.abs(Math.sin(t * 7.4)) * 0.04;
          rig.rotation.y = approach(rig.rotation.y, targetFacing, 0.07);
          const stride = Math.sin(t * 7.4) * 0.72;
          leftLeg.rotation.x = stride;
          rightLeg.rotation.x = -stride;
          leftKnee.rotation.x = Math.max(0, -stride) * 0.55;
          rightKnee.rotation.x = Math.max(0, stride) * 0.55;
          leftArm.rotation.x = -stride * 0.55;
          rightArm.rotation.x = stride * 0.55;
        } else if (activeState === "present") {
          rig.position.x = approach(rig.position.x, -2.6, 0.05);
          rig.position.z = approach(rig.position.z, -1.25, 0.05);
          rig.position.y = approach(rig.position.y, 0, 0.08);
          rig.rotation.y = approach(rig.rotation.y, Math.PI, 0.06);
          headPivot.rotation.y = approach(headPivot.rotation.y, 0.55, 0.06);
          rightArm.rotation.z = -0.72;
          rightArm.rotation.x = -0.35;
          rightForearm.rotation.x = -0.75;
        } else if (activeState === "listen") {
          rig.rotation.y = approach(rig.rotation.y, 0.1, 0.055);
          headPivot.rotation.x = approach(headPivot.rotation.x, 0.05, 0.06);
          leftArm.rotation.x = approach(leftArm.rotation.x, -0.12, 0.06);
          rightArm.rotation.x = approach(rightArm.rotation.x, -0.12, 0.06);
        } else if (activeState === "sit") {
          rig.position.x = approach(rig.position.x, 0, 0.05);
          rig.position.z = approach(rig.position.z, 1.1, 0.05);
          rig.rotation.y = approach(rig.rotation.y, 0, 0.06);
          rig.position.y = approach(rig.position.y, -0.72, 0.045);
          leftLeg.rotation.x = approach(leftLeg.rotation.x, -1.15, 0.07);
          rightLeg.rotation.x = approach(rightLeg.rotation.x, -1.15, 0.07);
          leftKnee.rotation.x = approach(leftKnee.rotation.x, 1.55, 0.07);
          rightKnee.rotation.x = approach(rightKnee.rotation.x, 1.55, 0.07);
        }

        const cameraTargetX = activeState === "present" || activeState === "listen" ? -1.1 : 0;
        camera.position.x = approach(camera.position.x, cameraTargetX, 0.015);
        camera.lookAt(rig.position.x * 0.3, 2.2, rig.position.z * 0.15);
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("isabel-three-state", stateListener);
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const chooseState = (next: MotionState) => {
    setRunning(false);
    setIndex(sequence.findIndex((item) => item.state === next));
  };

  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div ref={mountRef} className={styles.canvas} />
        <aside className={styles.panel}>
          <span>ISABEL · REAL-TIME 3D BEHAVIOR PROOF</span>
          <h1>{labels[state]}</h1>
          <p>
            This bundle adds seated work, user recognition, standing, path-aware walking,
            evidence presentation, listening, return, sitting, blinking, breathing, mouth motion,
            monitor focus and camera tracking.
          </p>
          <div className={styles.buttons}>
            <button className={running ? styles.active : ""} onClick={() => setRunning((value) => !value)}>
              {running ? "Pause sequence" : "Resume sequence"}
            </button>
            {sequence.map((item) => (
              <button
                key={item.state}
                className={!running && state === item.state ? styles.active : ""}
                onClick={() => chooseState(item.state)}
              >
                {labels[item.state]}
              </button>
            ))}
          </div>
          <dl>
            <div><dt>Renderer</dt><dd>Three.js WebGL</dd></div>
            <div><dt>Behavior states</dt><dd>8 coordinated states</dd></div>
            <div><dt>Movement</dt><dd>path and facing aware</dd></div>
            <div><dt>Character asset</dt><dd>placeholder pending Isabel GLB</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
