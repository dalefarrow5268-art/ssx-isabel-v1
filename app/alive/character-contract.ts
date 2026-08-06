export type IsabelBehaviorState =
  | "working"
  | "noticing"
  | "welcoming"
  | "listening"
  | "thinking"
  | "presenting"
  | "walking"
  | "awaiting-confirmation"
  | "returning";

export type IsabelAnchor =
  | "desk-chair"
  | "desk-standing"
  | "schedule-monitor"
  | "evidence-monitor"
  | "collaboration-table"
  | "window"
  | "office-entry";

export type IsabelGazeTarget = IsabelAnchor | "user" | "document" | "none";

export type IsabelMotionClip =
  | "idle-seated"
  | "idle-standing"
  | "type"
  | "read"
  | "turn-head"
  | "turn-chair"
  | "stand"
  | "walk"
  | "stop"
  | "pivot"
  | "present-small"
  | "listen"
  | "sit";

export type IsabelViseme =
  | "sil"
  | "PP"
  | "FF"
  | "TH"
  | "DD"
  | "kk"
  | "CH"
  | "SS"
  | "nn"
  | "RR"
  | "aa"
  | "E"
  | "ih"
  | "oh"
  | "ou";

export interface IsabelPerformanceCommand {
  speech: string;
  behavior: IsabelBehaviorState;
  destination?: IsabelAnchor;
  gazeTarget: IsabelGazeTarget;
  motion: IsabelMotionClip;
  gesture?: IsabelMotionClip;
  emotionalIntent: "neutral" | "warm" | "focused" | "serious" | "reassuring";
  requiresConfirmation: boolean;
  screenAction?: {
    screen: "schedule" | "evidence" | "field" | "risk" | "audit";
    action: "focus" | "open" | "highlight" | "clear";
    recordId?: string;
  };
}

export interface IsabelCharacterManifest {
  modelUrl: string;
  skeletonBones: {
    hips: string;
    spine: string;
    chest: string;
    neck: string;
    head: string;
    leftEye: string;
    rightEye: string;
  };
  morphTargets: {
    blinkLeft: string;
    blinkRight: string;
    jawOpen: string;
    smileLeft: string;
    smileRight: string;
    browInnerUp: string;
    visemes: Record<IsabelViseme, string>;
  };
  clips: Record<IsabelMotionClip, string>;
}

export const REQUIRED_ISABEL_MANIFEST: IsabelCharacterManifest = {
  modelUrl: "/models/isabel/isabel-v1.glb",
  skeletonBones: {
    hips: "Hips",
    spine: "Spine",
    chest: "Chest",
    neck: "Neck",
    head: "Head",
    leftEye: "LeftEye",
    rightEye: "RightEye",
  },
  morphTargets: {
    blinkLeft: "eyeBlinkLeft",
    blinkRight: "eyeBlinkRight",
    jawOpen: "jawOpen",
    smileLeft: "mouthSmileLeft",
    smileRight: "mouthSmileRight",
    browInnerUp: "browInnerUp",
    visemes: {
      sil: "viseme_sil",
      PP: "viseme_PP",
      FF: "viseme_FF",
      TH: "viseme_TH",
      DD: "viseme_DD",
      kk: "viseme_kk",
      CH: "viseme_CH",
      SS: "viseme_SS",
      nn: "viseme_nn",
      RR: "viseme_RR",
      aa: "viseme_aa",
      E: "viseme_E",
      ih: "viseme_ih",
      oh: "viseme_oh",
      ou: "viseme_ou",
    },
  },
  clips: {
    "idle-seated": "Idle_Seated",
    "idle-standing": "Idle_Standing",
    type: "Type",
    read: "Read",
    "turn-head": "Turn_Head",
    "turn-chair": "Turn_Chair",
    stand: "Stand",
    walk: "Walk",
    stop: "Stop",
    pivot: "Pivot",
    "present-small": "Present_Small",
    listen: "Listen",
    sit: "Sit",
  },
};

export const OFFICE_ANCHORS: Record<IsabelAnchor, { x: number; y: number; z: number; facing: number }> = {
  "desk-chair": { x: 0.2, y: 0, z: 1.8, facing: Math.PI },
  "desk-standing": { x: 0.2, y: 0, z: 0.8, facing: Math.PI },
  "schedule-monitor": { x: -2.4, y: 0, z: -1.4, facing: 0.15 },
  "evidence-monitor": { x: -0.4, y: 0, z: -1.7, facing: 0 },
  "collaboration-table": { x: 2.6, y: 0, z: 0.5, facing: -Math.PI / 2 },
  window: { x: 3.6, y: 0, z: -1.1, facing: -Math.PI / 2 },
  "office-entry": { x: 0, y: 0, z: 4.6, facing: Math.PI },
};

export function validateCharacterManifest(manifest: IsabelCharacterManifest): string[] {
  const errors: string[] = [];
  if (!manifest.modelUrl.endsWith(".glb")) errors.push("modelUrl must point to a .glb file");
  for (const [key, value] of Object.entries(manifest.skeletonBones)) {
    if (!value.trim()) errors.push(`missing skeleton bone mapping: ${key}`);
  }
  for (const [key, value] of Object.entries(manifest.morphTargets)) {
    if (typeof value === "string" && !value.trim()) errors.push(`missing morph target mapping: ${key}`);
  }
  for (const [clip, name] of Object.entries(manifest.clips)) {
    if (!name.trim()) errors.push(`missing animation clip mapping: ${clip}`);
  }
  return errors;
}
