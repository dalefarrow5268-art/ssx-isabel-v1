"use client";

import { useEffect, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import styles from "./three.module.css";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";

type Step = { state: MotionState; ms: number; title: string; detail: string };

const sequence: Step[] = [
  { state: "working", ms: 3600, title: "Working at the desk", detail: "Reviewing schedule, evidence and open risk items." },
  { state: "notice", ms: 1800, title: "Noticing the user", detail: "Pausing work and acknowledging your arrival." },
  { state: "stand", ms: 1800, title: "Standing from the chair", detail: "Transitioning from desk work into a briefing." },
  { state: "walk", ms: 5600, title: "Walking to the evidence wall", detail: "Moving through fixed office coordinates toward the active display." },
  { state: "present", ms: 5200, title: "Presenting linked evidence", detail: "Highlighting the critical screen and explaining the issue." },
  { state: "listen", ms: 3000, title: "Listening for direction", detail: "Holding attention on the user and awaiting confirmation." },
  { state: "return", ms: 5600, title: "Returning to the desk", detail: "Turning first, then walking back along the room path." },
  { state: "sit", ms: 2200, title: "Sitting and resuming work", detail: "Returning to the seated work posture and restarting the loop." },
];

const speechStates = new Set<MotionState>(["present"]);
const seatedStates = new Set<MotionState>(["working", "notice", "sit"]);

export default function ThreeMotionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [cameraMode, setCameraMode] = useState<"wide" | "follow">("follow");
  const step = sequence[index];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % sequence.length), step.ms);
    return () => window.clearTimeout(timer);
  }, [index, running, step.ms]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-three-state", { detail: step.state }));
  }, [step.state]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-camera-mode", { detail: cameraMode }));
  }, [cameraMode]);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090d12);
      scene.fog = new THREE.Fog(0x090d12, 11, 28);

      const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 4.6, 11.8);
      camera.lookAt(0, 2.1, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xcde7ff, 0x1d1712, 1.65));
      const key = new THREE.DirectionalLight(0xfff3df, 3.4);
      key.position.set(4, 8, 5);
      key.castShadow = true;
      scene.add(key);
      const amber = new THREE.PointLight(0xffa84d, 26, 18);
      amber.position.set(5.8, 3.8, 1.8);
      scene.add(amber);
      const cyan = new THREE.PointLight(0x4ec8ff, 15, 16);
      cyan.position.set(-5.2, 4.2, -3);
      scene.add(cyan);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 13),
        new THREE.MeshStandardMaterial({ color: 0x161a1f, roughness: 0.7, metalness: 0.12 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(15, 6.8, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x11171e, roughness: 0.62 }),
      );
      backWall.position.set(0, 3.35, -4.45);
      scene.add(backWall);

      const sideWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 6.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x121820, roughness: 0.7 }),
      );
      sideWall.position.set(7.35, 3.35, 0.15);
      scene.add(sideWall);

      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 4.8, 6.4),
        new THREE.MeshStandardMaterial({ color: 0xb56a25, emissive: 0x4a1f08, emissiveIntensity: 0.9 }),
      );
      accent.position.set(7.15, 3.2, -0.45);
      scene.add(accent);

      const monitorMaterials = [0x15677f, 0x675025, 0x294f61].map(
        (emissive) => new THREE.MeshStandardMaterial({ color: 0x101b23, emissive, emissiveIntensity: 1.25, roughness: 0.28 }),
      );
      const monitors: Mesh[] = [];
      for (let i = -1; i <= 1; i++) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(3.05, 1.95, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x050709, metalness: 0.75, roughness: 0.28 }),
        );
        frame.position.set(i * 3.45, 3.65, -4.16);
        scene.add(frame);
        const screen = new THREE.Mesh(new THREE.BoxGeometry(2.82, 1.7, 0.08), monitorMaterials[i + 1]);
        screen.position.set(i * 3.45, 3.65, -4.04);
        scene.add(screen);
        monitors.push(screen);
      }

      const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3b27, roughness: 0.46, metalness: 0.08 });
      const desk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 1.7), tableMaterial);
      desk.position.set(0.4, 1.2, 2.15);
      desk.castShadow = true;
      scene.add(desk);
      const deskLegA = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 1.35), tableMaterial);
      deskLegA.position.set(-1.75, 0.58, 2.15);
      const deskLegB = deskLegA.clone();
      deskLegB.position.x = 2.55;
      scene.add(deskLegA, deskLegB);

      const chair = new THREE.Group();
      const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.72 });
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 1.0), chairMaterial);
      chairSeat.position.y = 0.76;
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.4, 0.18), chairMaterial);
      chairBack.position.set(0, 1.48, 0.42);
      chair.add(chairSeat, chairBack);
      chair.position.set(0.4, 0, 1.42);
      scene.add(chair);

      const rig = new THREE.Group();
      scene.add(rig);
      const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
      const suit = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6 });
      const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xc69a50, metalness: 0.75, roughness: 0.25 });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.25, 8, 16), suit);
      torso.position.y = 2.52;
      torso.castShadow = true;
      rig.add(torso);
      const lapelA = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.88, 0.05), new THREE.MeshStandardMaterial({ color: 0x252a30 }));
      lapelA.position.set(-0.18, 2.62, 0.55);
      lapelA.rotation.z = -0.2;
      const lapelB = lapelA.clone();
      lapelB.position.x = 0.18;
      lapelB.rotation.z = 0.2;
      rig.add(lapelA, lapelB);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.28, 18), skin);
      neck.position.y = 3.36;
      rig.add(neck);
      const headPivot = new THREE.Group();
      headPivot.position.y = 3.79;
      rig.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), skin);
      head.scale.set(0.88, 1.08, 0.9);
      head.castShadow = true;
      headPivot.add(head);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 18), hair);
      bun.position.set(0, 0.34, -0.28);
      headPivot.add(bun);
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), hair);
      hairCap.position.set(0, 0.08, -0.04);
      headPivot.add(hairCap);

      const eyes: Mesh[] = [];
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1410, roughness: 0.15 });
      [-0.17, 0.17].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMaterial);
        eye.position.set(x, 0.06, 0.43);
        headPivot.add(eye);
        eyes.push(eye);
      });
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.025), new THREE.MeshStandardMaterial({ color: 0x672929 }));
      mouth.position.set(0, -0.17, 0.43);
      headPivot.add(mouth);
      [-0.5, 0.5].forEach((side) => {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), gold);
        hoop.position.set(side * 0.86, -0.02, 0.03);
        hoop.rotation.y = Math.PI / 2;
        headPivot.add(hoop);
      });

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
      leftArm.position.set(-0.72, 2.92, 0);
      rightArm.position.set(0.72, 2.92, 0);
      rig.add(leftArm, rightArm);
      const leftForearm = makeLimb(leftArm, 0.15, 0.72);
      const rightForearm = makeLimb(rightArm, 0.15, 0.72);
      const leftLeg = new THREE.Group();
      const rightLeg = new THREE.Group();
      leftLeg.position.set(-0.28, 1.72, 0);
      rightLeg.position.set(0.28, 1.72, 0);
      rig.add(leftLeg, rightLeg);
      const leftKnee = makeLimb(leftLeg, 0.19, 0.88);
      const rightKnee = makeLimb(rightLeg, 0.19, 0.88);

      rig.position.set(0.4, -0.72, 1.1);
      rig.rotation.y = 0;

      const clock = new THREE.Clock();
      let frame = 0;
      let activeState: MotionState = step.state;
      let activeCamera: "wide" | "follow" = cameraMode;
      const stateListener = (event: Event) => { activeState = (event as CustomEvent<MotionState>).detail; };
      const cameraListener = (event: Event) => { activeCamera = (event as CustomEvent<"wide" | "follow">).detail; };
      window.addEventListener("isabel-three-state", stateListener);
      window.addEventListener("isabel-camera-mode", cameraListener);

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
        const speaking = speechStates.has(activeState);

        torso.scale.y = 1 + Math.sin(t * 1.65) * 0.022;
        eyes.forEach((eye) => (eye.scale.y = Math.sin(t * 2.4) > 0.986 ? 0.18 : 1));
        mouth.scale.y = speaking ? 0.5 + Math.abs(Math.sin(t * 8.8)) * 1.8 : 0.25;
        monitors.forEach((monitor, monitorIndex) => {
          const material = monitor.material as import("three").MeshStandardMaterial;
          material.emissiveIntensity = activeState === "present" && monitorIndex === 0 ? 3.8 : 1.25;
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
          rig.position.x = approach(rig.position.x, 0.4, 0.04);
          rig.position.z = approach(rig.position.z, 1.1, 0.04);
          rig.position.y = approach(rig.position.y, -0.72, 0.05);
          rig.rotation.y = approach(rig.rotation.y, 0, 0.05);
          leftLeg.rotation.x = -1.15;
          rightLeg.rotation.x = -1.15;
          leftKnee.rotation.x = 1.55;
          rightKnee.rotation.x = 1.55;
          leftForearm.rotation.x = -1 + Math.sin(t * 4.2) * 0.09;
          rightForearm.rotation.x = -1 - Math.sin(t * 4.2) * 0.09;
          headPivot.rotation.y = Math.sin(t * 0.55) * 0.06;
        } else if (activeState === "notice") {
          rig.position.y = approach(rig.position.y, -0.72, 0.05);
          leftLeg.rotation.x = -1.15;
          rightLeg.rotation.x = -1.15;
          leftKnee.rotation.x = 1.55;
          rightKnee.rotation.x = 1.55;
          headPivot.rotation.x = approach(headPivot.rotation.x, -0.08, 0.08);
        } else if (activeState === "stand") {
          rig.position.y = approach(rig.position.y, 0, 0.055);
          leftLeg.rotation.x = approach(leftLeg.rotation.x, 0, 0.08);
          rightLeg.rotation.x = approach(rightLeg.rotation.x, 0, 0.08);
          leftKnee.rotation.x = approach(leftKnee.rotation.x, 0, 0.08);
          rightKnee.rotation.x = approach(rightKnee.rotation.x, 0, 0.08);
          leftArm.rotation.x = approach(leftArm.rotation.x, 0, 0.08);
          rightArm.rotation.x = approach(rightArm.rotation.x, 0, 0.08);
        } else if (activeState === "walk" || activeState === "return") {
          const returning = activeState === "return";
          const targetX = returning ? 0.4 : -2.75;
          const targetZ = returning ? 1.1 : -1.45;
          const dx = targetX - rig.position.x;
          const dz = targetZ - rig.position.z;
          rig.position.x = approach(rig.position.x, targetX, 0.014);
          rig.position.z = approach(rig.position.z, targetZ, 0.014);
          rig.position.y = Math.abs(Math.sin(t * 7.2)) * 0.04;
          rig.rotation.y = approach(rig.rotation.y, Math.atan2(dx, dz), 0.07);
          const stride = Math.sin(t * 7.2) * 0.7;
          leftLeg.rotation.x = stride;
          rightLeg.rotation.x = -stride;
          leftKnee.rotation.x = Math.max(0, -stride) * 0.55;
          rightKnee.rotation.x = Math.max(0, stride) * 0.55;
          leftArm.rotation.x = -stride * 0.52;
          rightArm.rotation.x = stride * 0.52;
        } else if (activeState === "present") {
          rig.position.x = approach(rig.position.x, -2.75, 0.05);
          rig.position.z = approach(rig.position.z, -1.45, 0.05);
          rig.position.y = approach(rig.position.y, 0, 0.08);
          rig.rotation.y = approach(rig.rotation.y, Math.PI, 0.06);
          headPivot.rotation.y = approach(headPivot.rotation.y, 0.52, 0.06);
          rightArm.rotation.z = -0.78;
          rightArm.rotation.x = -0.28;
          rightForearm.rotation.x = -0.82;
          leftArm.rotation.z = 0.15 + Math.sin(t * 1.5) * 0.05;
        } else if (activeState === "listen") {
          rig.rotation.y = approach(rig.rotation.y, 0.35, 0.055);
          headPivot.rotation.y = approach(headPivot.rotation.y, -0.18, 0.06);
          headPivot.rotation.x = approach(headPivot.rotation.x, 0.05, 0.06);
          leftForearm.rotation.x = -0.22;
          rightForearm.rotation.x = -0.18;
        } else if (activeState === "sit") {
          rig.position.x = approach(rig.position.x, 0.4, 0.05);
          rig.position.z = approach(rig.position.z, 1.1, 0.05);
          rig.rotation.y = approach(rig.rotation.y, 0, 0.05);
          rig.position.y = approach(rig.position.y, -0.72, 0.045);
          leftLeg.rotation.x = approach(leftLeg.rotation.x, -1.15, 0.08);
          rightLeg.rotation.x = approach(rightLeg.rotation.x, -1.15, 0.08);
          leftKnee.rotation.x = approach(leftKnee.rotation.x, 1.55, 0.08);
          rightKnee.rotation.x = approach(rightKnee.rotation.x, 1.55, 0.08);
        }

        const follow = activeCamera === "follow";
        const targetCamX = follow ? rig.position.x * 0.42 : 0;
        const targetCamY = activeState === "present" && follow ? 4.25 : 4.6;
        const targetCamZ = activeState === "present" && follow ? 9.2 : 11.8;
        camera.position.x = approach(camera.position.x, targetCamX, 0.025);
        camera.position.y = approach(camera.position.y, targetCamY, 0.025);
        camera.position.z = approach(camera.position.z, targetCamZ, 0.025);
        camera.lookAt(follow ? rig.position.x * 0.38 : 0, 2.15, follow ? rig.position.z * 0.18 : 0);

        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("isabel-three-state", stateListener);
        window.removeEventListener("isabel-camera-mode", cameraListener);
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => { cancelled = true; cleanup(); };
  }, []);

  const chooseState = (next: MotionState) => {
    setRunning(false);
    setIndex(sequence.findIndex((item) => item.state === next));
  };

  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div ref={mountRef} className={styles.canvas} />
        <div className={styles.brand}>SSX · ISABEL V1 · LIVE MOTION LAB</div>
        <div className={styles.status}><i />CODE-DRIVEN · NO BAKED CHARACTER</div>
        <aside className={styles.panel}>
          <span>ACTIVE PRESENCE STATE</span>
          <h1>{step.title}</h1>
          <p>{step.detail}</p>
          <div className={styles.controls}>
            <button className={running ? styles.active : ""} onClick={() => setRunning((value) => !value)}>{running ? "Pause sequence" : "Resume sequence"}</button>
            <button className={cameraMode === "follow" ? styles.active : ""} onClick={() => setCameraMode((value) => value === "follow" ? "wide" : "follow")}>{cameraMode === "follow" ? "Follow camera" : "Wide camera"}</button>
          </div>
          <div className={styles.timeline}>
            {sequence.map((item, itemIndex) => (
              <button key={item.state} className={itemIndex === index ? styles.current : ""} onClick={() => chooseState(item.state)}>
                <b>{String(itemIndex + 1).padStart(2, "0")}</b><span>{item.title}</span>
              </button>
            ))}
          </div>
          <dl>
            <div><dt>Renderer</dt><dd>Three.js WebGL</dd></div>
            <div><dt>Direction</dt><dd>path-facing turns</dd></div>
            <div><dt>Camera</dt><dd>{cameraMode}</dd></div>
            <div><dt>Final asset</dt><dd>Isabel GLB pending</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
