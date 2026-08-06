"use client";

import { useEffect, useState } from "react";
import ThreeMotionLab from "./three/page";
import {
  ISABEL_RUNTIME_EVENTS,
  PERFORMANCE_PROOF_COMMANDS,
  resolveMotionState,
  type IsabelCommandReceipt,
  type IsabelRuntimeCommand,
} from "./three/isabel-performance";

type LiveFeedback = {
  screen: string;
  gaze: string;
  tone: string;
  speechMode: string;
  confirmation: "none" | "waiting" | "approved" | "declined";
};

const EMPTY_FEEDBACK: LiveFeedback = {
  screen: "none",
  gaze: "none",
  tone: "neutral",
  speechMode: "silent",
  confirmation: "none",
};

function sendToOffice(command: IsabelRuntimeCommand): IsabelCommandReceipt {
  const errors: string[] = [];
  if (!command.id.trim()) errors.push("id is required");
  if (!command.issuedAt.trim() || Number.isNaN(Date.parse(command.issuedAt))) errors.push("issuedAt must be a valid ISO date");
  if (command.requiresConfirmation && command.behavior !== "awaiting-confirmation") {
    errors.push("confirmation commands must use awaiting-confirmation behavior");
  }

  const motionState = resolveMotionState(command);
  const receipt: IsabelCommandReceipt = {
    id: command.id,
    accepted: errors.length === 0,
    motionState,
    confirmationRequired: command.requiresConfirmation,
    errors,
  };
  if (errors.length) return receipt;

  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.command, { detail: command }));
  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.motion, { detail: motionState }));
  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.camera, { detail: command.camera ?? "follow" }));
  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.gaze, {
    detail: { target: command.gazeTarget, destination: command.destination },
  }));
  if (command.screenAction) window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.screen, { detail: command.screenAction }));
  if (command.speech.trim()) {
    window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.speech, {
      detail: {
        commandId: command.id,
        text: command.speech,
        mode: command.speechMode ?? "preview",
        emotionalIntent: command.emotionalIntent,
      },
    }));
  }
  if (command.requiresConfirmation) {
    window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.confirmation, {
      detail: { commandId: command.id, speech: command.speech, screenAction: command.screenAction },
    }));
  }
  window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.receipt, { detail: receipt }));
  return receipt;
}

export default function IsabelCommandConsole() {
  const [active, setActive] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<IsabelCommandReceipt | null>(null);
  const [speech, setSpeech] = useState("Waiting for a performance command.");
  const [feedback, setFeedback] = useState<LiveFeedback>(EMPTY_FEEDBACK);

  useEffect(() => {
    const screenListener = (event: Event) => {
      const detail = (event as CustomEvent<{ screen: string; action: string }>).detail;
      setFeedback((value) => ({ ...value, screen: `${detail.screen} · ${detail.action}` }));
    };
    const gazeListener = (event: Event) => {
      const detail = (event as CustomEvent<{ target: string }>).detail;
      setFeedback((value) => ({ ...value, gaze: detail.target }));
    };
    const speechListener = (event: Event) => {
      const detail = (event as CustomEvent<{ mode: string; emotionalIntent: string }>).detail;
      setFeedback((value) => ({ ...value, speechMode: detail.mode, tone: detail.emotionalIntent }));
    };
    const confirmationListener = () => {
      setFeedback((value) => ({ ...value, confirmation: "waiting" }));
    };

    window.addEventListener(ISABEL_RUNTIME_EVENTS.screen, screenListener);
    window.addEventListener(ISABEL_RUNTIME_EVENTS.gaze, gazeListener);
    window.addEventListener(ISABEL_RUNTIME_EVENTS.speech, speechListener);
    window.addEventListener(ISABEL_RUNTIME_EVENTS.confirmation, confirmationListener);
    return () => {
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.screen, screenListener);
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.gaze, gazeListener);
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.speech, speechListener);
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.confirmation, confirmationListener);
    };
  }, []);

  const run = (index: number) => {
    const command = PERFORMANCE_PROOF_COMMANDS[index];
    setFeedback({
      screen: command.screenAction ? `${command.screenAction.screen} · ${command.screenAction.action}` : "none",
      gaze: command.gazeTarget,
      tone: command.emotionalIntent,
      speechMode: command.speechMode ?? "speak",
      confirmation: command.requiresConfirmation ? "waiting" : "none",
    });
    const nextReceipt = sendToOffice(command);
    setActive(index);
    setReceipt(nextReceipt);
    setSpeech(command.speech);
  };

  const resolveConfirmation = (decision: "approved" | "declined") => {
    setFeedback((value) => ({ ...value, confirmation: decision }));
    setSpeech(decision === "approved"
      ? "Approved. I will prepare the formal notice and preserve the supporting evidence."
      : "Understood. I will hold the notice and continue monitoring the risk.");
    window.dispatchEvent(new CustomEvent("isabel-confirmation-resolved", {
      detail: { decision, commandId: receipt?.id ?? null },
    }));
  };

  const chip = (label: string, value: string) => (
    <div style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "8px 10px", background: "rgba(255,255,255,.035)" }}>
      <div style={{ fontSize: 9, letterSpacing: ".12em", color: "#7895a3", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#d8e7ee" }}>{value}</div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#05080c", color: "#eef5f8", fontFamily: "Arial, sans-serif" }}>
      <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        <ThreeMotionLab />
        <aside style={{
          position: "absolute", left: 20, bottom: 20, width: "min(570px, calc(100vw - 40px))",
          padding: 18, borderRadius: 16, background: "rgba(4, 9, 14, .94)",
          border: "1px solid rgba(128, 196, 224, .28)", boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          backdropFilter: "blur(14px)", zIndex: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: "#8ecde5", marginBottom: 8 }}>
            ISABEL REASONING → PERFORMANCE CONTROL
          </div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Live command proof</h1>
          <p style={{ margin: "0 0 14px", color: "#b8c7cf", lineHeight: 1.45 }}>{speech}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {["Present evidence", "Request approval", "Return to work"].map((label, index) => (
              <button key={label} onClick={() => run(index)} style={{
                cursor: "pointer", borderRadius: 10, padding: "10px 8px", border: "1px solid rgba(255,255,255,.15)",
                background: active === index ? "#176b83" : "#111a21", color: "white", fontWeight: 700,
              }}>{label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 7, marginTop: 12 }}>
            {chip("SCREEN", feedback.screen)}
            {chip("GAZE", feedback.gaze)}
            {chip("TONE", feedback.tone)}
            {chip("VOICE", feedback.speechMode)}
          </div>

          {feedback.confirmation === "waiting" ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 11, border: "1px solid rgba(245,184,75,.38)", background: "rgba(245,184,75,.08)" }}>
              <div style={{ fontSize: 12, color: "#f3cf83", marginBottom: 9 }}>Isabel is waiting for authorization.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => resolveConfirmation("approved")} style={{ cursor: "pointer", border: 0, borderRadius: 8, padding: "8px 13px", fontWeight: 700, background: "#2b8296", color: "white" }}>Approve</button>
                <button onClick={() => resolveConfirmation("declined")} style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "8px 13px", fontWeight: 700, background: "#131b21", color: "white" }}>Decline</button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontSize: 12, color: "#9fb0b9" }}>
            <span>Receipt: {receipt ? (receipt.accepted ? "accepted" : "rejected") : "pending"}</span>
            <span>Motion: {receipt?.motionState ?? "none"}</span>
            <span>Confirmation: {feedback.confirmation}</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
