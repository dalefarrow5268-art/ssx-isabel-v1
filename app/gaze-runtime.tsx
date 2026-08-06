"use client";

import { useEffect } from "react";

type GazeTarget = "user" | "schedule-monitor" | "evidence-monitor" | "desk-chair" | "desk" | "none" | string;

type GazeRequest = {
  target?: GazeTarget;
  destination?: string;
};

type HeadPose = {
  target: GazeTarget;
  yaw: number;
  pitch: number;
  intensity: number;
};

const GAZE_REQUEST_EVENT = "isabel-gaze-request";
const HEAD_POSE_EVENT = "isabel-head-pose";

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
    let current = targetPose("user");
    let desired = current;

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<GazeRequest>).detail;
      desired = targetPose(detail?.target ?? detail?.destination ?? "user");
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

    window.addEventListener(GAZE_REQUEST_EVENT, listener);
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(GAZE_REQUEST_EVENT, listener);
    };
  }, []);

  return null;
}
