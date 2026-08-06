"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh, Object3D, SkinnedMesh } from "three";
import styles from "./three.module.css";

type MotionState = "working" | "notice" | "stand" | "walk" | "present" | "listen" | "return" | "sit";
type CameraMode = "wide" | "follow";
type AssetPhase = "checking" | "loading" | "validating" | "ready" | "placeholder";
type Step = { state: MotionState; ms: number; title: string; detail: string };
type Check = { label: string; ok: boolean; detail: string };
type AssetReport = { phase: AssetPhase; source: string; checks: Check[]; error?: string };
type ScreenAction = { screen: string; action: string; recordId?: string };

const MODEL_PATH = "/models/isabel/isabel-v1.glb";
const REQUIRED_BONES = ["Hips", "Spine", "Chest", "Neck", "Head"];
const REQUIRED_MORPHS = ["eyeBlinkLeft", "eyeBlinkRight", "jawOpen"];
const REQUIRED_CLIPS = ["idle", "walk"];

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

const DEFAULT_REPORT: AssetReport = { phase: "checking", source: MODEL_PATH, checks: [] };

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function includesNamed(values: string[], required: string) {
  const target = normalizeName(required);
  return values.some((value) => normalizeName(value).includes(target));
}

function inspectAsset(root: Object3D, animations: AnimationClip[]) {
  const boneNames: string[] = [];
  const morphNames = new Set<string>();
  let skinnedMeshes = 0;
  let texturedMaterials = 0;
  let renderableMeshes = 0;

  root.traverse((object) => {
    if ((object as { isBone?: boolean }).isBone) boneNames.push(object.name);
    if ((object as SkinnedMesh).isSkinnedMesh) skinnedMeshes += 1;
    if ((object as Mesh).isMesh) {
      renderableMeshes += 1;
      const mesh = object as Mesh;
      Object.keys(mesh.morphTargetDictionary ?? {}).forEach((name) => morphNames.add(name));
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material && "map" in material && material.map) texturedMaterials += 1;
      });
    }
  });

  const clipNames = animations.map((clip) => clip.name);
  return [
    { label: "Renderable geometry", ok: renderableMeshes > 0, detail: `${renderableMeshes} meshes` },
    { label: "Skinned body rig", ok: skinnedMeshes > 0, detail: `${skinnedMeshes} skinned meshes` },
    ...REQUIRED_BONES.map((bone) => ({ label: `Bone: ${bone}`, ok: includesNamed(boneNames, bone), detail: includesNamed(boneNames, bone) ? "found" : "missing" })),
    ...REQUIRED_MORPHS.map((morph) => ({ label: `Morph: ${morph}`, ok: includesNamed([...morphNames], morph), detail: includesNamed([...morphNames], morph) ? "found" : "missing" })),
    ...REQUIRED_CLIPS.map((clip) => ({ label: `Animation: ${clip}`, ok: includesNamed(clipNames, clip), detail: includesNamed(clipNames, clip) ? "found" : "missing" })),
    { label: "Texture maps", ok: texturedMaterials > 0, detail: `${texturedMaterials} mapped materials` },
  ];
}

function createPlaceholder(THREE: typeof import("three")) {
  const rig = new THREE.Group();
  rig.name = "PROCEDURAL_PLACEHOLDER_NOT_ISABEL";
  const skin = new THREE.MeshStandardMaterial({ color: 0xb97863, roughness: 0.56 });
  const suit = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.78 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.25, 8, 16), suit);
  torso.position.y = 2.52;
  rig.add(torso);

  const headPivot = new THREE.Group();
  headPivot.position.y = 3.79;
  rig.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), skin);
  head.scale.set(0.88, 1.08, 0.9);
  headPivot.add(head);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 18), hair);
  bun.position.set(0, 0.34, -0.28);
  headPivot.add(bun);

  const eyes: Mesh[] = [];
  [-0.17, 0.17].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1b1410 }));
    eye.position.set(x, 0.06, 0.43);
    headPivot.add(eye);
    eyes.push(eye);
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.025), new THREE.MeshStandardMaterial({ color: 0x672929 }));
  mouth.position.set(0, -0.17, 0.43);
  headPivot.add(mouth);

  const makeLimb = (x: number, y: number, radius: number, length: number) => {
    const limb = new THREE.Group();
    limb.position.set(x, y, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), suit);
    upper.position.y = -0.5;
    limb.add(upper);
    rig.add(limb);
  };
  makeLimb(-0.72, 2.92, 0.15, 0.72);
  makeLimb(0.72, 2.92, 0.15, 0.72);
  makeLimb(-0.28, 1.72, 0.19, 0.88);
  makeLimb(0.28, 1.72, 0.19, 0.88);

  return { rig, torso, headPivot, eyes, mouth };
}

function drawMonitor(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  detail: ScreenAction | null,
  waiting: boolean,
) {
  const width = canvas.width;
  const height = canvas.height;
  const accent = waiting ? "#f2b34f" : "#58d8ff";
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, waiting ? "#281704" : "#071a22");
  background.addColorStop(1, waiting ? "#100b04" : "#040b10");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.strokeRect(18, 18, width - 36, height - 36);

  context.fillStyle = accent;
  context.font = "700 30px Arial";
  context.fillText(waiting ? "AUTHORIZATION REQUIRED" : "ISABEL ACTIVE DISPLAY", 48, 72);

  context.fillStyle = "#ffffff";
  context.font = "700 48px Arial";
  const title = detail ? `${detail.screen.toUpperCase()} · ${detail.action.toUpperCase()}` : "MONITOR STANDING BY";
  context.fillText(title, 48, 150);

  context.fillStyle = "#b9d4df";
  context.font = "32px Arial";
  context.fillText(detail?.recordId ?? "No active record", 48, 215);

  context.fillStyle = accent;
  context.fillRect(48, height - 70, width - 96, 8);
  context.fillStyle = "#8ba7b2";
  context.font = "24px Arial";
  context.fillText("SSX · ISABEL · LIVE PROJECT INTELLIGENCE", 48, height - 28);
}

export default function ThreeMotionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [assetReport, setAssetReport] = useState<AssetReport>(DEFAULT_REPORT);
  const step = sequence[index];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % sequence.length), step.ms);
    return () => window.clearTimeout(timer);
  }, [running, step.ms]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-three-state", { detail: step.state }));
  }, [step.state]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("isabel-camera-mode", { detail: cameraMode }));
  }, [cameraMode]);

  useEffect(() => {
    let cleanup = () => undefined;
    let cancelled = false;

    void (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090d12);
      scene.fog = new THREE.Fog(0x090d12, 11, 28);

      const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 4.6, 11.8);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
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

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 13), new THREE.MeshStandardMaterial({ color: 0x161a1f, roughness: 0.7 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(15, 6.8, 0.32), new THREE.MeshStandardMaterial({ color: 0x11171e }));
      backWall.position.set(0, 3.35, -4.45);
      scene.add(backWall);
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.8, 10), new THREE.MeshStandardMaterial({ color: 0x121820 }));
      sideWall.position.set(7.35, 3.35, 0.15);
      scene.add(sideWall);
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.8, 6.4), new THREE.MeshStandardMaterial({ color: 0xb56a25, emissive: 0x4a1f08 }));
      accent.position.set(7.15, 3.2, -0.45);
      scene.add(accent);

      const monitorCanvas = document.createElement("canvas");
      monitorCanvas.width = 1024;
      monitorCanvas.height = 576;
      const monitorContext = monitorCanvas.getContext("2d");
      if (!monitorContext) throw new Error("Unable to create monitor canvas context");
      drawMonitor(monitorContext, monitorCanvas, null, false);
      const monitorTexture = new THREE.CanvasTexture(monitorCanvas);
      monitorTexture.colorSpace = THREE.SRGBColorSpace;
      monitorTexture.needsUpdate = true;

      const monitors: Mesh[] = [];
      [-1, 0, 1].forEach((position, monitorIndex) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.95, 0.18), new THREE.MeshStandardMaterial({ color: 0x050709, metalness: 0.75 }));
        frame.position.set(position * 3.45, 3.65, -4.16);
        scene.add(frame);
        const material = monitorIndex === 0
          ? new THREE.MeshStandardMaterial({ map: monitorTexture, emissive: 0x174e60, emissiveIntensity: 1.4, roughness: 0.22 })
          : new THREE.MeshStandardMaterial({ color: 0x101b23, emissive: [0x15677f, 0x675025, 0x294f61][monitorIndex], emissiveIntensity: 1.25 });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(2.82, 1.7, 0.08), material);
        screen.position.set(position * 3.45, 3.65, -4.04);
        scene.add(screen);
        monitors.push(screen);
      });

      const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b27, roughness: 0.46 });
      const desk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 1.7), wood);
      desk.position.set(0.4, 1.2, 2.15);
      scene.add(desk);
      [-1.75, 2.55].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 1.35), wood);
        leg.position.set(x, 0.58, 2.15);
        scene.add(leg);
      });

      const placeholder = createPlaceholder(THREE);
      let character: Group = placeholder.rig;
      character.position.set(0.4, -0.72, 1.1);
      scene.add(character);
      setAssetReport({ phase: "loading", source: MODEL_PATH, checks: [] });

      try {
        const gltf = await new GLTFLoader().loadAsync(MODEL_PATH);
        if (cancelled) return;
        const checks = inspectAsset(gltf.scene, gltf.animations);
        const requiredReady = checks
          .filter((check) => check.label.startsWith("Bone:") || check.label.startsWith("Morph:") || check.label.startsWith("Animation:") || check.label === "Skinned body rig")
          .every((check) => check.ok);
        if (!requiredReady) throw new Error("The GLB loaded, but required rig, face, or motion capabilities are missing.");

        scene.remove(character);
        character = gltf.scene;
        character.name = "ISABEL_PRODUCTION_GLB";
        const box = new THREE.Box3().setFromObject(character);
        const size = box.getSize(new THREE.Vector3());
        character.scale.setScalar(size.y > 0 ? 4.15 / size.y : 1);
        const calibrated = new THREE.Box3().setFromObject(character);
        character.position.set(0.4, -calibrated.min.y - 0.72, 1.1);
        character.traverse((object) => {
          if ((object as Mesh).isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        scene.add(character);
        setAssetReport({ phase: "ready", source: MODEL_PATH, checks });
      } catch (error) {
        setAssetReport({
          phase: "placeholder",
          source: MODEL_PATH,
          error: error instanceof Error ? error.message : "Unknown model-loading error",
          checks: [{ label: "Production GLB", ok: false, detail: "placeholder active" }],
        });
      }

      const clock = new THREE.Clock();
      let frame = 0;
      let activeState: MotionState = step.state;
      let activeCamera: CameraMode = cameraMode;
      let activeScreen: ScreenAction | null = null;
      let confirmationWaiting = false;

      const stateListener = (event: Event) => { activeState = (event as CustomEvent<MotionState>).detail; };
      const cameraListener = (event: Event) => { activeCamera = (event as CustomEvent<CameraMode>).detail; };
      const screenListener = (event: Event) => {
        activeScreen = (event as CustomEvent<ScreenAction>).detail;
        drawMonitor(monitorContext, monitorCanvas, activeScreen, confirmationWaiting);
        monitorTexture.needsUpdate = true;
      };
      const confirmationListener = () => {
        confirmationWaiting = true;
        drawMonitor(monitorContext, monitorCanvas, activeScreen, true);
        monitorTexture.needsUpdate = true;
      };
      const resolvedListener = () => {
        confirmationWaiting = false;
        drawMonitor(monitorContext, monitorCanvas, activeScreen, false);
        monitorTexture.needsUpdate = true;
      };

      window.addEventListener("isabel-three-state", stateListener);
      window.addEventListener("isabel-camera-mode", cameraListener);
      window.addEventListener("isabel-screen-action", screenListener);
      window.addEventListener("isabel-confirmation-required", confirmationListener);
      window.addEventListener("isabel-confirmation-resolved", resolvedListener);

      const approach = (current: number, target: number, speed: number) => current + (target - current) * speed;
      const resize = () => {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", resize);

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        monitors.forEach((monitor, monitorIndex) => {
          const material = monitor.material as import("three").MeshStandardMaterial;
          const selected = monitorIndex === 0 && activeScreen !== null;
          material.emissiveIntensity = selected ? 2.8 + Math.sin(t * 4) * 0.35 : activeState === "present" && monitorIndex === 0 ? 2.1 : 1.25;
        });

        if (character === placeholder.rig) {
          placeholder.torso.scale.y = 1 + Math.sin(t * 1.65) * 0.022;
          placeholder.eyes.forEach((eye) => { eye.scale.y = Math.sin(t * 2.4) > 0.986 ? 0.18 : 1; });
          placeholder.mouth.scale.y = activeState === "present" ? 0.5 + Math.abs(Math.sin(t * 8.8)) * 1.8 : 0.25;
        }

        if (activeState === "working" || activeState === "notice" || activeState === "sit") {
          character.position.x = approach(character.position.x, 0.4, 0.04);
          character.position.z = approach(character.position.z, 1.1, 0.04);
          character.position.y = approach(character.position.y, -0.72, 0.05);
          character.rotation.y = approach(character.rotation.y, 0, 0.05);
        } else if (activeState === "stand") {
          character.position.y = approach(character.position.y, 0, 0.055);
        } else if (activeState === "walk" || activeState === "return") {
          const returning = activeState === "return";
          const targetX = returning ? 0.4 : -2.75;
          const targetZ = returning ? 1.1 : -1.45;
          const dx = targetX - character.position.x;
          const dz = targetZ - character.position.z;
          character.position.x = approach(character.position.x, targetX, 0.014);
          character.position.z = approach(character.position.z, targetZ, 0.014);
          character.position.y = Math.abs(Math.sin(t * 7.2)) * 0.04;
          character.rotation.y = approach(character.rotation.y, Math.atan2(dx, dz), 0.07);
        } else if (activeState === "present") {
          character.position.x = approach(character.position.x, -2.75, 0.05);
          character.position.z = approach(character.position.z, -1.45, 0.05);
          character.position.y = approach(character.position.y, 0, 0.08);
          character.rotation.y = approach(character.rotation.y, Math.PI, 0.06);
        } else if (activeState === "listen") {
          character.rotation.y = approach(character.rotation.y, 0.35, 0.055);
        }

        const follow = activeCamera === "follow";
        camera.position.x = approach(camera.position.x, follow ? character.position.x * 0.42 : 0, 0.025);
        camera.position.y = approach(camera.position.y, activeState === "present" && follow ? 4.25 : 4.6, 0.025);
        camera.position.z = approach(camera.position.z, activeState === "present" && follow ? 9.2 : 11.8, 0.025);
        camera.lookAt(follow ? character.position.x * 0.38 : 0, 2.15, follow ? character.position.z * 0.18 : 0);
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("isabel-three-state", stateListener);
        window.removeEventListener("isabel-camera-mode", cameraListener);
        window.removeEventListener("isabel-screen-action", screenListener);
        window.removeEventListener("isabel-confirmation-required", confirmationListener);
        window.removeEventListener("isabel-confirmation-resolved", resolvedListener);
        monitorTexture.dispose();
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

  const passed = assetReport.checks.filter((check) => check.ok).length;
  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div ref={mountRef} className={styles.canvas} />
        <div className={styles.brand}>SSX · ISABEL V1 · LIVE MOTION LAB</div>
        <div className={styles.status}><i />{assetReport.phase === "ready" ? "PRODUCTION GLB ACTIVE" : "PROCEDURAL PLACEHOLDER · NOT ISABEL"}</div>
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
            <div><dt>Asset phase</dt><dd>{assetReport.phase}</dd></div>
            <div><dt>Model path</dt><dd>{assetReport.source}</dd></div>
            <div><dt>Validation</dt><dd>{assetReport.checks.length ? `${passed}/${assetReport.checks.length}` : "pending"}</dd></div>
            <div><dt>Camera</dt><dd>{cameraMode}</dd></div>
          </dl>
          {assetReport.error ? <p role="alert">GLB fallback: {assetReport.error}</p> : null}
        </aside>
      </section>
    </main>
  );
}
