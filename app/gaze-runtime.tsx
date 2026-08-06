"use client";

import { useEffect } from "react";

type GazeTarget = "user" | "schedule-monitor" | "evidence-monitor" | "desk-chair" | "desk" | "none" | string;

type GazeRequest = {
  target?: GazeTarget;
  destination?: string;
};

type SpeechLifecycle = {
  phase: "start" | "boundary" | "end" | "cancel" | "error";
};

type HeadPose = {
  target: GazeTarget;
  yaw: number;
  pitch: number;
  intensity: number;
};

const GAZE_REQUEST_EVENT = "isabel-gaze-request";
const HEAD_POSE_EVENT = "isabel-head-pose";
const SPEECH_LIFECYCLE_EVENT = "isabel-speech-lifecycle";

function targetPose(target: GazeTarget): HeadPose {
  switch (target) {
    case "evidence-monitor":
      return { target, yaw: -0.58, pitch: 0.03, intensity: 1 };
    case "schedule-monitor":
      return { target, yaw: 0.52, pitch: 0.03, intensity: 1 };
    case "desk-chair":
    case "desk":
      return { target, yaw: 0, pitch: -0.34, intensity: 0.9 };
    case "user":
      return { target, yaw: 0, pitch: -0.02, intensity: 1 };
    default:
      return { target: target || "none", yaw: 0, pitch: 0, intensity: 0.45 };
  }
}

export default function IsabelGazeRuntime() {
  useEffect(() => {
    let frame = 0;
    let commandTarget: GazeTarget = "user";
    let current = targetPose(commandTarget);
    let desired = current;
    let speaking = false;

    const gazeListener = (event: Event) => {
      const detail = (event as CustomEvent<GazeRequest>).detail;
      commandTarget = detail?.target ?? detail?.destination ?? "user";
      if (!speaking || commandTarget !== "user") {
        desired = targetPose(commandTarget);
      }
    };

    const speechListener = (event: Event) => {
      const detail = (event as CustomEvent<SpeechLifecycle>).detail;
      if (detail.phase === "start" || detail.phase === "boundary") {
        speaking = true;
        if (commandTarget === "user") desired = targetPose("user");
        return;
      }

      speaking = false;
      desired = targetPose(commandTarget);
    };

    const animate = () => {
      current = {
        target: desired.target,
        yaw: current.yaw + (desired.yaw - current.yaw) * 0.08,
        pitch: current.pitch + (desired.pitch - current.pitch) * 0.08,
        intensity: current.intensity + (desired.intensity - current.intensity) * 0.08,
      };
      window.dispatchEvent(new CustomEvent<HeadPose>(HEAD_POSE_EVENT, { detail: current }));
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener(GAZE_REQUEST_EVENT, gazeListener);
    window.addEventListener(SPEECH_LIFECYCLE_EVENT, speechListener);
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(GAZE_REQUEST_EVENT, gazeListener);
      window.removeEventListener(SPEECH_LIFECYCLE_EVENT, speechListener);
    };
  }, []);

  return null;
}
