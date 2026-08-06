import type {
  IsabelAnchor,
  IsabelBehaviorState,
  IsabelGazeTarget,
  IsabelMotionClip,
  IsabelPerformanceCommand,
} from "../alive/character-contract";

export type ThreeMotionState =
  | "working"
  | "notice"
  | "stand"
  | "walk"
  | "present"
  | "listen"
  | "return"
  | "sit";

export type IsabelCameraMode = "wide" | "follow";

export interface IsabelRuntimeCommand extends IsabelPerformanceCommand {
  id: string;
  issuedAt: string;
  priority?: "background" | "normal" | "urgent";
  camera?: IsabelCameraMode;
  speechMode?: "silent" | "preview" | "speak";
  metadata?: Record<string, string | number | boolean>;
}

export interface IsabelCommandReceipt {
  id: string;
  accepted: boolean;
  motionState: ThreeMotionState;
  confirmationRequired: boolean;
  errors: string[];
}

export const ISABEL_RUNTIME_EVENTS = {
  command: "isabel-performance-command",
  motion: "isabel-three-state",
  camera: "isabel-camera-mode",
  speech: "isabel-speech-request",
  gaze: "isabel-gaze-request",
  screen: "isabel-screen-action",
  confirmation: "isabel-confirmation-required",
  receipt: "isabel-command-receipt",
} as const;

const BEHAVIOR_TO_MOTION: Record<IsabelBehaviorState, ThreeMotionState> = {
  working: "working",
  noticing: "notice",
  welcoming: "notice",
  listening: "listen",
  thinking: "listen",
  presenting: "present",
  walking: "walk",
  "awaiting-confirmation": "listen",
  returning: "return",
};

const MOTION_TO_STATE: Partial<Record<IsabelMotionClip, ThreeMotionState>> = {
  "idle-seated": "working",
  "idle-standing": "listen",
  type: "working",
  read: "working",
  "turn-head": "notice",
  "turn-chair": "notice",
  stand: "stand",
  walk: "walk",
  stop: "listen",
  pivot: "present",
  "present-small": "present",
  listen: "listen",
  sit: "sit",
};

const SCREEN_ANCHORS: Partial<Record<NonNullable<IsabelPerformanceCommand["screenAction"]>["screen"], IsabelAnchor>> = {
  schedule: "schedule-monitor",
  evidence: "evidence-monitor",
  field: "evidence-monitor",
  risk: "evidence-monitor",
  audit: "evidence-monitor",
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function dispatch<T>(name: string, detail: T): void {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
}

export function resolveMotionState(command: IsabelPerformanceCommand): ThreeMotionState {
  if (command.behavior === "returning" || command.destination === "desk-chair") return "return";
  return MOTION_TO_STATE[command.motion] ?? BEHAVIOR_TO_MOTION[command.behavior];
}

export function resolveDestination(command: IsabelPerformanceCommand): IsabelAnchor | undefined {
  if (command.destination) return command.destination;
  if (command.screenAction) return SCREEN_ANCHORS[command.screenAction.screen];
  return undefined;
}

export function validatePerformanceCommand(command: IsabelRuntimeCommand): string[] {
  const errors: string[] = [];

  if (!command.id.trim()) errors.push("id is required");
  if (!command.issuedAt.trim() || Number.isNaN(Date.parse(command.issuedAt))) {
    errors.push("issuedAt must be a valid ISO date");
  }
  if (command.speechMode === "speak" && !command.speech.trim()) {
    errors.push("speech text is required when speechMode is speak");
  }
  if (command.requiresConfirmation && command.behavior !== "awaiting-confirmation") {
    errors.push("confirmation commands must use awaiting-confirmation behavior");
  }
  if (command.screenAction?.recordId !== undefined && !command.screenAction.recordId.trim()) {
    errors.push("screenAction.recordId cannot be blank");
  }

  return errors;
}

export function executeIsabelCommand(command: IsabelRuntimeCommand): IsabelCommandReceipt {
  const errors = validatePerformanceCommand(command);
  const motionState = resolveMotionState(command);
  const receipt: IsabelCommandReceipt = {
    id: command.id,
    accepted: errors.length === 0,
    motionState,
    confirmationRequired: command.requiresConfirmation,
    errors,
  };

  if (errors.length > 0) {
    dispatch(ISABEL_RUNTIME_EVENTS.receipt, receipt);
    return receipt;
  }

  dispatch(ISABEL_RUNTIME_EVENTS.command, command);
  dispatch(ISABEL_RUNTIME_EVENTS.motion, motionState);
  dispatch(ISABEL_RUNTIME_EVENTS.camera, command.camera ?? "follow");

  const gazeDetail: { target: IsabelGazeTarget; destination?: IsabelAnchor } = {
    target: command.gazeTarget,
    destination: resolveDestination(command),
  };
  dispatch(ISABEL_RUNTIME_EVENTS.gaze, gazeDetail);

  if (command.screenAction) {
    dispatch(ISABEL_RUNTIME_EVENTS.screen, command.screenAction);
  }

  if ((command.speechMode ?? "speak") !== "silent" && command.speech.trim()) {
    dispatch(ISABEL_RUNTIME_EVENTS.speech, {
      commandId: command.id,
      text: command.speech,
      mode: command.speechMode ?? "speak",
      emotionalIntent: command.emotionalIntent,
    });
  }

  if (command.requiresConfirmation) {
    dispatch(ISABEL_RUNTIME_EVENTS.confirmation, {
      commandId: command.id,
      speech: command.speech,
      screenAction: command.screenAction,
    });
  }

  dispatch(ISABEL_RUNTIME_EVENTS.receipt, receipt);
  return receipt;
}

export function createIsabelCommand(
  input: Omit<IsabelRuntimeCommand, "id" | "issuedAt"> & Partial<Pick<IsabelRuntimeCommand, "id" | "issuedAt">>,
): IsabelRuntimeCommand {
  return {
    ...input,
    id: input.id ?? `isabel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
  };
}

export const PERFORMANCE_PROOF_COMMANDS: IsabelRuntimeCommand[] = [
  createIsabelCommand({
    speech: "I found a schedule conflict and linked the supporting evidence on the left display.",
    behavior: "presenting",
    destination: "evidence-monitor",
    gazeTarget: "evidence-monitor",
    motion: "present-small",
    emotionalIntent: "focused",
    requiresConfirmation: false,
    camera: "follow",
    speechMode: "preview",
    screenAction: { screen: "evidence", action: "highlight", recordId: "proof-schedule-conflict" },
  }),
  createIsabelCommand({
    speech: "This change affects the committed completion date. Should I prepare the formal notice?",
    behavior: "awaiting-confirmation",
    gazeTarget: "user",
    motion: "listen",
    emotionalIntent: "serious",
    requiresConfirmation: true,
    camera: "follow",
    speechMode: "preview",
    screenAction: { screen: "risk", action: "focus", recordId: "proof-critical-risk" },
  }),
  createIsabelCommand({
    speech: "I will return to the desk and continue monitoring the project.",
    behavior: "returning",
    destination: "desk-chair",
    gazeTarget: "desk-chair",
    motion: "walk",
    emotionalIntent: "reassuring",
    requiresConfirmation: false,
    camera: "wide",
    speechMode: "preview",
  }),
];
