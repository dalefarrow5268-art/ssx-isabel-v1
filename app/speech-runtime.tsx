"use client";

import { useEffect, useState } from "react";
import { ISABEL_RUNTIME_EVENTS } from "./three/isabel-performance";

type VoiceState = "idle" | "speaking" | "stopped" | "unavailable";

type SpeechRequest = {
  commandId?: string;
  text: string;
  mode?: "silent" | "preview" | "speak";
  emotionalIntent?: "neutral" | "warm" | "focused" | "serious" | "reassuring";
};

type SpeechLifecycle = {
  commandId?: string;
  phase: "start" | "boundary" | "end" | "cancel" | "error";
  charIndex?: number;
  charLength?: number;
  elapsedTime?: number;
  text: string;
};

const SPEECH_LIFECYCLE_EVENT = "isabel-speech-lifecycle";

function dispatchLifecycle(detail: SpeechLifecycle) {
  window.dispatchEvent(new CustomEvent<SpeechLifecycle>(SPEECH_LIFECYCLE_EVENT, { detail }));
}

function voiceSettings(intent: SpeechRequest["emotionalIntent"]) {
  switch (intent) {
    case "warm": return { rate: 0.94, pitch: 1.03 };
    case "focused": return { rate: 0.98, pitch: 0.98 };
    case "serious": return { rate: 0.9, pitch: 0.92 };
    case "reassuring": return { rate: 0.91, pitch: 1.0 };
    default: return { rate: 0.96, pitch: 1.0 };
  }
}

export default function IsabelSpeechRuntime() {
  const [state, setState] = useState<VoiceState>("idle");
  const [lastText, setLastText] = useState("Voice runtime ready");
  const [voiceName, setVoiceName] = useState("browser default");

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setState("unavailable");
      return;
    }

    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith("en") && /female|samantha|zira|aria|jenny|ava|serena/i.test(voice.name),
      ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
      if (preferred) setVoiceName(preferred.name);
      return preferred;
    };

    chooseVoice();
    window.speechSynthesis.addEventListener("voiceschanged", chooseVoice);

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<SpeechRequest>).detail;
      if (!detail?.text?.trim() || detail.mode === "silent") return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(detail.text);
      const selectedVoice = chooseVoice();
      if (selectedVoice) utterance.voice = selectedVoice;
      const settings = voiceSettings(detail.emotionalIntent);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = 1;

      utterance.onstart = () => {
        setState("speaking");
        dispatchLifecycle({ commandId: detail.commandId, phase: "start", text: detail.text });
      };
      utterance.onboundary = (boundary) => {
        dispatchLifecycle({
          commandId: detail.commandId,
          phase: "boundary",
          charIndex: boundary.charIndex,
          charLength: boundary.charLength,
          elapsedTime: boundary.elapsedTime,
          text: detail.text,
        });
      };
      utterance.onend = () => {
        setState("idle");
        dispatchLifecycle({ commandId: detail.commandId, phase: "end", text: detail.text });
      };
      utterance.onerror = () => {
        setState("stopped");
        dispatchLifecycle({ commandId: detail.commandId, phase: "error", text: detail.text });
      };

      setLastText(detail.text);
      window.speechSynthesis.speak(utterance);
    };

    const confirmationListener = (event: Event) => {
      const detail = (event as CustomEvent<{ decision: "approved" | "declined" }>).detail;
      const text = detail.decision === "approved"
        ? "Approved. I will prepare the formal notice and preserve the supporting evidence."
        : "Understood. I will hold the notice and continue monitoring the risk.";
      window.dispatchEvent(new CustomEvent(ISABEL_RUNTIME_EVENTS.speech, {
        detail: { text, mode: "speak", emotionalIntent: detail.decision === "approved" ? "focused" : "reassuring" },
      }));
    };

    window.addEventListener(ISABEL_RUNTIME_EVENTS.speech, listener);
    window.addEventListener("isabel-confirmation-resolved", confirmationListener);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", chooseVoice);
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.speech, listener);
      window.removeEventListener("isabel-confirmation-resolved", confirmationListener);
    };
  }, []);

  const stop = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setState("stopped");
    dispatchLifecycle({ phase: "cancel", text: lastText });
  };

  return (
    <div style={{
      position: "fixed", right: 18, bottom: 18, zIndex: 40, width: 260, padding: 12,
      borderRadius: 12, border: "1px solid rgba(126,211,238,.28)",
      background: "rgba(4,9,14,.92)", color: "#dcebf1", boxShadow: "0 16px 44px rgba(0,0,0,.38)",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: ".15em", color: "#82cce5" }}>ISABEL VOICE</div>
          <div style={{ fontSize: 12, marginTop: 3 }}>{state === "speaking" ? "Speaking now" : state}</div>
        </div>
        <button onClick={stop} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid rgba(255,255,255,.14)", background: "#121b21", color: "white", padding: "6px 9px" }}>Stop</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "#8298a3" }}>{voiceName}</div>
      <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.35, color: "#b9cbd3", maxHeight: 46, overflow: "hidden" }}>{lastText}</div>
    </div>
  );
}
