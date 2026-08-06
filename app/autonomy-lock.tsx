"use client";

import { useEffect } from "react";
import { ISABEL_RUNTIME_EVENTS } from "./three/isabel-performance";

/**
 * Ensures only one movement controller owns Isabel at a time.
 * Any external performance command pauses the autonomous presence timeline
 * before its motion event is processed, preventing conflicting state updates.
 */
export default function IsabelAutonomyLock() {
  useEffect(() => {
    const pauseAutonomy = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const pauseButton = buttons.find((button) => button.textContent?.trim() === "Pause sequence");
      pauseButton?.click();

      window.dispatchEvent(new CustomEvent("isabel-control-owner", {
        detail: { owner: "command", autonomyRunning: false },
      }));
    };

    window.addEventListener(ISABEL_RUNTIME_EVENTS.command, pauseAutonomy);
    return () => window.removeEventListener(ISABEL_RUNTIME_EVENTS.command, pauseAutonomy);
  }, []);

  return null;
}
