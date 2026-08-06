import * as THREE from "three";
import type { IsabelViseme } from "../text-viseme";

type MorphBinding = {
  mesh: THREE.Mesh;
  index: number;
  current: number;
  target: number;
};

type VisemeCue = {
  shape: IsabelViseme;
  strength?: number;
  durationMs?: number;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const VISEME_ALIASES: Record<Exclude<IsabelViseme, "rest">, string[]> = {
  closed: ["visemepp", "pp", "visememm", "mouthclose", "mouthclosed"],
  open: ["visemeaa", "aa", "jawopen", "mouthopen", "visemedd", "dd"],
  wide: ["visemee", "e", "visemeih", "ih", "mouthstretchleft", "mouthstretchright"],
  round: ["visemeoh", "oh", "visemeou", "ou", "mouthfunnel", "mouthpucker"],
};

const BLINK_LEFT_ALIASES = ["eyeblinkleft", "blinkleft", "eyeclosedleft"];
const BLINK_RIGHT_ALIASES = ["eyeblinkright", "blinkright", "eyeclosedright"];

function collectMorphs(root: THREE.Object3D) {
  const result = new Map<string, MorphBinding[]>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      const key = normalize(name);
      const list = result.get(key) ?? [];
      list.push({ mesh, index, current: mesh.morphTargetInfluences[index] ?? 0, target: 0 });
      result.set(key, list);
    }
  });
  return result;
}

function resolveBindings(
  morphs: Map<string, MorphBinding[]>,
  aliases: string[],
): MorphBinding[] {
  const exact: MorphBinding[] = [];
  for (const alias of aliases.map(normalize)) {
    const bindings = morphs.get(alias);
    if (bindings?.length) exact.push(...bindings);
  }
  if (exact.length) return exact;

  const partial: MorphBinding[] = [];
  for (const [name, bindings] of morphs) {
    if (aliases.some((alias) => name.includes(normalize(alias)))) partial.push(...bindings);
  }
  return partial;
}

export class IsabelFacialPerformanceController {
  private readonly morphs: Map<string, MorphBinding[]>;
  private readonly visemeBindings = new Map<Exclude<IsabelViseme, "rest">, MorphBinding[]>();
  private readonly blinkLeft: MorphBinding[];
  private readonly blinkRight: MorphBinding[];
  private readonly allBindings = new Set<MorphBinding>();
  private nextBlinkAt = performance.now() + 2200 + Math.random() * 2200;
  private blinkStartedAt = -1;
  private blinkDurationMs = 135;

  constructor(root: THREE.Object3D) {
    this.morphs = collectMorphs(root);
    for (const shape of Object.keys(VISEME_ALIASES) as Array<Exclude<IsabelViseme, "rest">>) {
      const bindings = resolveBindings(this.morphs, VISEME_ALIASES[shape]);
      this.visemeBindings.set(shape, bindings);
      bindings.forEach((binding) => this.allBindings.add(binding));
    }
    this.blinkLeft = resolveBindings(this.morphs, BLINK_LEFT_ALIASES);
    this.blinkRight = resolveBindings(this.morphs, BLINK_RIGHT_ALIASES);
    this.blinkLeft.forEach((binding) => this.allBindings.add(binding));
    this.blinkRight.forEach((binding) => this.allBindings.add(binding));

    console.info("ISABEL_FACIAL_CONTRACT", {
      morphTargets: this.morphs.size,
      closed: this.visemeBindings.get("closed")?.length ?? 0,
      open: this.visemeBindings.get("open")?.length ?? 0,
      wide: this.visemeBindings.get("wide")?.length ?? 0,
      round: this.visemeBindings.get("round")?.length ?? 0,
      blinkLeft: this.blinkLeft.length,
      blinkRight: this.blinkRight.length,
    });
  }

  setViseme(cue: VisemeCue) {
    for (const bindings of this.visemeBindings.values()) {
      for (const binding of bindings) binding.target = 0;
    }
    if (cue.shape === "rest") return;
    const strength = THREE.MathUtils.clamp(cue.strength ?? 0.8, 0, 1);
    for (const binding of this.visemeBindings.get(cue.shape) ?? []) {
      binding.target = strength;
    }
  }

  private setBlink(value: number) {
    for (const binding of this.blinkLeft) binding.target = Math.max(binding.target, value);
    for (const binding of this.blinkRight) binding.target = Math.max(binding.target, value);
  }

  update(deltaSeconds: number, nowMs = performance.now()) {
    if (this.blinkStartedAt < 0 && nowMs >= this.nextBlinkAt) {
      this.blinkStartedAt = nowMs;
      this.blinkDurationMs = 115 + Math.random() * 55;
    }

    if (this.blinkStartedAt >= 0) {
      const progress = (nowMs - this.blinkStartedAt) / this.blinkDurationMs;
      if (progress >= 1) {
        this.setBlink(0);
        this.blinkStartedAt = -1;
        this.nextBlinkAt = nowMs + 2600 + Math.random() * 3600;
      } else {
        const blink = progress < 0.45 ? progress / 0.45 : 1 - (progress - 0.45) / 0.55;
        this.setBlink(THREE.MathUtils.clamp(blink, 0, 1));
      }
    }

    const response = 1 - Math.exp(-Math.max(deltaSeconds, 0) * 18);
    for (const binding of this.allBindings) {
      binding.current = THREE.MathUtils.lerp(binding.current, binding.target, response);
      if (binding.mesh.morphTargetInfluences) {
        binding.mesh.morphTargetInfluences[binding.index] = binding.current;
      }
    }
  }

  reset() {
    for (const binding of this.allBindings) {
      binding.current = 0;
      binding.target = 0;
      if (binding.mesh.morphTargetInfluences) binding.mesh.morphTargetInfluences[binding.index] = 0;
    }
  }
}
