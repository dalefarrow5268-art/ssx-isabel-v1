"use client";

import { useEffect } from "react";
import type { IsabelRuntimeCommand, ThreeMotionState } from "./three/isabel-performance";
import { ISABEL_RUNTIME_EVENTS } from "./three/isabel-performance";

const RETURN_WALK_MS = 5600;

function emitMotion(state: ThreeMotionState) {
  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.motion, { detail: state }));
}

export default function IsabelCommandChoreography() {
  useEffect(() => {
    let timers: number[] = [];

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const listener = (event: Event) => {
      const command = (event as CustomEvent<IsabelRuntimeCommand>).detail;
      clearTimers();

      const returning = command.behavior === "returning" || command.destination === "desk-chair";
      if (!returning) return;

      // The command bridge emits `return` immediately. When Isabel reaches the desk,
      // end the choreography in the seated state and stay seated until the next command.
      timers.push(window.setTimeout(() => emitMotion("sit"), RETURN_WALK_MS));
    };

    window.addEventListener(ISABEL_RUNTIME_EVENTS.command, listener);
    return () => {
      clearTimers();
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.command, listener);
    };
  }, []);

  return null;
}
