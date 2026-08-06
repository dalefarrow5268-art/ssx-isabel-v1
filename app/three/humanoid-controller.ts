import * as THREE from "three";
import { retargetClip } from "three/examples/jsm/utils/SkeletonUtils.js";

export type HumanoidAction =
  | "idle"
  | "work"
  | "notice"
  | "stand"
  | "walk"
  | "turn"
  | "sit"
  | "present"
  | "listen"
  | "point"
  | "reach";

export type HumanoidBoneRole =
  | "hips"
  | "spine"
  | "chest"
  | "neck"
  | "head"
  | "leftUpperArm"
  | "leftLowerArm"
  | "leftHand"
  | "rightUpperArm"
  | "rightLowerArm"
  | "rightHand"
  | "leftUpperLeg"
  | "leftLowerLeg"
  | "leftFoot"
  | "rightUpperLeg"
  | "rightLowerLeg"
  | "rightFoot";

export type RigReport = {
  bones: Partial<Record<HumanoidBoneRole, THREE.Bone>>;
  missing: HumanoidBoneRole[];
  skinnedMeshes: THREE.SkinnedMesh[];
  morphTargets: Set<string>;
  height: number;
};

export type MotionSource = {
  name: HumanoidAction;
  clip: THREE.AnimationClip;
  sourceRoot: THREE.Object3D;
  sourceSkeleton?: THREE.Skeleton;
};

const REQUIRED_BONES: HumanoidBoneRole[] = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
];

const BONE_ALIASES: Record<HumanoidBoneRole, string[]> = {
  hips: ["hips", "pelvis", "hip"],
  spine: ["spine", "spine01", "spine1"],
  chest: ["chest", "spine02", "spine2", "upperchest"],
  neck: ["neck"],
  head: ["head"],
  leftUpperArm: ["leftupperarm", "lupperarm", "upperarml", "mixamorighleftarm"],
  leftLowerArm: ["leftforearm", "leftlowerarm", "lforearm", "lowerarml", "mixamorighleftforearm"],
  leftHand: ["lefthand", "handl", "mixamorighlefthand"],
  rightUpperArm: ["rightupperarm", "rupperarm", "upperarmr", "mixamorighrightarm"],
  rightLowerArm: ["rightforearm", "rightlowerarm", "rforearm", "lowerarmr", "mixamorighrightforearm"],
  rightHand: ["righthand", "handr", "mixamorighrighthand"],
  leftUpperLeg: ["leftupperleg", "leftthigh", "uplegl", "mixamorighleftupleg"],
  leftLowerLeg: ["leftlowerleg", "leftshin", "legl", "mixamorighleftleg"],
  leftFoot: ["leftfoot", "footl", "mixamorighleftfoot"],
  rightUpperLeg: ["rightupperleg", "rightthigh", "uplegr", "mixamorighrightupleg"],
  rightLowerLeg: ["rightlowerleg", "rightshin", "legr", "mixamorighrightleg"],
  rightFoot: ["rightfoot", "footr", "mixamorighrightfoot"],
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function findBone(bones: THREE.Bone[], role: HumanoidBoneRole): THREE.Bone | undefined {
  const aliases = BONE_ALIASES[role];
  return bones.find((bone) => {
    const name = normalize(bone.name);
    return aliases.some((alias) => name === alias || name.includes(alias));
  });
}

export function inspectHumanoid(root: THREE.Object3D): RigReport {
  const allBones: THREE.Bone[] = [];
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const morphTargets = new Set<string>();

  root.traverse((object) => {
    if ((object as THREE.Bone).isBone) allBones.push(object as THREE.Bone);
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = object as THREE.SkinnedMesh;
      skinnedMeshes.push(mesh);
      Object.keys(mesh.morphTargetDictionary ?? {}).forEach((name) => morphTargets.add(name));
    }
  });

  const bones: Partial<Record<HumanoidBoneRole, THREE.Bone>> = {};
  REQUIRED_BONES.forEach((role) => {
    const bone = findBone(allBones, role);
    if (bone) bones[role] = bone;
  });

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  return {
    bones,
    missing: REQUIRED_BONES.filter((role) => !bones[role]),
    skinnedMeshes,
    morphTargets,
    height: size.y,
  };
}

function primarySkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh {
  let target: THREE.SkinnedMesh | undefined;
  root.traverse((object) => {
    if (!target && (object as THREE.SkinnedMesh).isSkinnedMesh) target = object as THREE.SkinnedMesh;
  });
  if (!target) throw new Error("Humanoid target has no SkinnedMesh");
  return target;
}

export function buildBoneNameMap(target: RigReport, sourceRoot: THREE.Object3D) {
  const source = inspectHumanoid(sourceRoot);
  const names: Record<string, string> = {};
  REQUIRED_BONES.forEach((role) => {
    const targetBone = target.bones[role];
    const sourceBone = source.bones[role];
    if (targetBone && sourceBone) names[targetBone.name] = sourceBone.name;
  });
  return names;
}

export function retargetHumanoidClip(
  targetRoot: THREE.Object3D,
  sourceRoot: THREE.Object3D,
  clip: THREE.AnimationClip,
): THREE.AnimationClip {
  const targetReport = inspectHumanoid(targetRoot);
  if (targetReport.missing.length) {
    throw new Error(`Target rig missing bones: ${targetReport.missing.join(", ")}`);
  }
  const targetMesh = primarySkinnedMesh(targetRoot);
  const names = buildBoneNameMap(targetReport, sourceRoot);
  const sourceReport = inspectHumanoid(sourceRoot);
  const sourceHip = sourceReport.bones.hips?.name ?? "Hips";

  return retargetClip(targetMesh, sourceRoot, clip, {
    names,
    hip: sourceHip,
    preserveBoneMatrix: true,
    preserveBonePositions: true,
    useFirstFramePosition: false,
  });
}

export class HumanoidAnimationController {
  readonly root: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly report: RigReport;

  private readonly actions = new Map<HumanoidAction, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private currentName: HumanoidAction | null = null;

  constructor(root: THREE.Object3D) {
    this.root = root;
    this.report = inspectHumanoid(root);
    this.mixer = new THREE.AnimationMixer(root);

    if (!this.report.skinnedMeshes.length) throw new Error("Humanoid rig contains no skinned mesh");
    if (this.report.missing.length) {
      throw new Error(`Humanoid rig is incomplete: ${this.report.missing.join(", ")}`);
    }
  }

  registerClip(name: HumanoidAction, clip: THREE.AnimationClip, loop = true) {
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    this.actions.set(name, action);
    return action;
  }

  registerRetargeted(source: MotionSource, loop = true) {
    const clip = retargetHumanoidClip(this.root, source.sourceRoot, source.clip);
    return this.registerClip(source.name, clip, loop);
  }

  play(name: HumanoidAction, fadeSeconds = 0.28, reset = false) {
    const next = this.actions.get(name);
    if (!next) throw new Error(`No animation registered for action: ${name}`);
    if (this.currentName === name && !reset) return;

    if (reset) next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();

    if (this.current && this.current !== next) this.current.crossFadeTo(next, fadeSeconds, true);
    else next.fadeIn(fadeSeconds);

    this.current = next;
    this.currentName = name;
  }

  stop(fadeSeconds = 0.2) {
    if (this.current) this.current.fadeOut(fadeSeconds);
    this.current = null;
    this.currentName = null;
  }

  update(deltaSeconds: number) {
    this.mixer.update(deltaSeconds);
  }

  dispose() {
    this.stop(0);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.actions.clear();
  }
}

export const THREE_STATE_TO_ACTION: Record<string, HumanoidAction> = {
  working: "work",
  notice: "notice",
  stand: "stand",
  walk: "walk",
  present: "present",
  listen: "listen",
  return: "walk",
  sit: "sit",
};
