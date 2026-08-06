"use client";

import { useState } from "react";
import ThreeMotionLab from "./three/page";
import {
  ISABEL_RUNTIME_EVENTS,
  PERFORMANCE_PROOF_COMMANDS,
  resolveMotionState,
  type IsabelCommandReceipt,
  type IsabelRuntimeCommand,
} from "./three/isabel-performance";

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
  return receipt;
}

export default function IsabelCommandConsole() {
  const [active, setActive] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<IsabelCommandReceipt | null>(null);
  const [speech, setSpeech] = useState("Waiting for a performance command.");

  const run = (index: number) => {
    const command = PERFORMANCE_PROOF_COMMANDS[index];
    const nextReceipt = sendToOffice(command);
    setActive(index);
    setReceipt(nextReceipt);
    setSpeech(command.speech);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#05080c", color: "#eef5f8", fontFamily: "Arial, sans-serif" }}>
      <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        <ThreeMotionLab />
        <aside style={{
          position: "absolute", left: 20, bottom: 20, width: "min(520px, calc(100vw - 40px))",
          padding: 18, borderRadius: 16, background: "rgba(4, 9, 14, .92)",
          border: "1px solid rgba(128, 196, 224, .28)", boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          backdropFilter: "blur(14px)", zIndex: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: "#8ecde5", marginBottom: 8 }}>
            ISABEL REASONING → PERFORMANCE CONTROL
          </div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>External command proof</h1>
          <p style={{ margin: "0 0 14px", color: "#b8c7cf", lineHeight: 1.45 }}>{speech}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {["Present evidence", "Request approval", "Return to work"].map((label, index) => (
              <button key={label} onClick={() => run(index)} style={{
                cursor: "pointer", borderRadius: 10, padding: "10px 8px", border: "1px solid rgba(255,255,255,.15)",
                background: active === index ? "#176b83" : "#111a21", color: "white", fontWeight: 700,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#9fb0b9" }}>
            <span>Receipt: {receipt ? (receipt.accepted ? "accepted" : "rejected") : "pending"}</span>
            <span>Motion: {receipt?.motionState ?? "none"}</span>
            <span>Confirmation: {receipt?.confirmationRequired ? "required" : "no"}</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
