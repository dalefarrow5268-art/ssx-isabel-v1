"use client";

import { useEffect, useRef, useState } from "react";
import { buildVisemeTimeline } from "./text-viseme";
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
  source?: "browser" | "cadence";
  rate?: number;
};

const SPEECH_LIFECYCLE_EVENT = "isabel-speech-lifecycle";
const VISEME_TIMELINE_EVENT = "isabel-viseme-timeline";
const VISEME_CUE_EVENT = "isabel-viseme-cue";

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

function cadenceDelay(text: string, index: number, rate: number) {
  const character = text[index] ?? "";
  const next = text[index + 1] ?? "";
  const base = 145 / Math.max(rate, 0.7);
  if (/[.!?]/.test(character)) return base * 3.4;
  if (/[,;:]/.test(character)) return base * 2.1;
  if (/\s/.test(character)) return base * 0.72;
  if (/[aeiouy]/i.test(character) || /[aeiouy]/i.test(next)) return base * 0.92;
  return base * 0.68;
}

export default function IsabelSpeechRuntime() {
  const [state, setState] = useState<VoiceState>("idle");
  const [lastText, setLastText] = useState("Voice runtime ready");
  const [voiceName, setVoiceName] = useState("browser default");
  const cadenceTimerRef = useRef<number | null>(null);
  const visemeTimersRef = useRef<number[]>([]);
  const speechTokenRef = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setState("unavailable");
      return;
    }

    const clearCadence = () => {
      if (cadenceTimerRef.current !== null) {
        window.clearTimeout(cadenceTimerRef.current);
        cadenceTimerRef.current = null;
      }
    };

    const clearVisemes = () => {
      visemeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      visemeTimersRef.current = [];
      window.dispatchEvent(new CustomEvent(VISEME_CUE_EVENT, {
        detail: { shape: "rest", strength: 0, durationMs: 100 },
      }));
    };

    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith("en") && /female|samantha|zira|aria|jenny|ava|serena/i.test(voice.name),
      ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
      if (preferred) setVoiceName(preferred.name);
      return preferred;
    };

    const startCadence = (detail: SpeechRequest, rate: number, token: number) => {
      clearCadence();
      let index = 0;
      const pulse = () => {
        if (speechTokenRef.current !== token || index >= detail.text.length) return;
        dispatchLifecycle({ commandId: detail.commandId, phase: "boundary", charIndex: index, charLength: 1, text: detail.text, source: "cadence", rate });
        const delay = cadenceDelay(detail.text, index, rate);
        index += /\s/.test(detail.text[index] ?? "") ? 1 : 2;
        cadenceTimerRef.current = window.setTimeout(pulse, delay);
      };
      cadenceTimerRef.current = window.setTimeout(pulse, 70);
    };

    const startVisemes = (timeline: ReturnType<typeof buildVisemeTimeline>, token: number) => {
      clearVisemes();
      visemeTimersRef.current = timeline.map((cue, index) => window.setTimeout(() => {
        if (speechTokenRef.current !== token) return;
        window.dispatchEvent(new CustomEvent(VISEME_CUE_EVENT, {
          detail: {
            shape: cue.viseme,
            strength: cue.strength,
            durationMs: cue.durationMs,
            index,
          },
        }));
      }, Math.max(0, cue.startMs)));
    };

    chooseVoice();
    window.speechSynthesis.addEventListener("voiceschanged", chooseVoice);

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<SpeechRequest>).detail;
      if (!detail?.text?.trim() || detail.mode === "silent") return;

      speechTokenRef.current += 1;
      const token = speechTokenRef.current;
      clearCadence();
      clearVisemes();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(detail.text);
      const selectedVoice = chooseVoice();
      if (selectedVoice) utterance.voice = selectedVoice;
      const settings = voiceSettings(detail.emotionalIntent);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = 1;
      const timeline = buildVisemeTimeline(detail.text, settings.rate);

      window.dispatchEvent(new CustomEvent(VISEME_TIMELINE_EVENT, {
        detail: { commandId: detail.commandId, text: detail.text, rate: settings.rate, timeline },
      }));

      utterance.onstart = () => {
        if (speechTokenRef.current !== token) return;
        setState("speaking");
        dispatchLifecycle({ commandId: detail.commandId, phase: "start", text: detail.text, source: "browser", rate: settings.rate });
        startCadence(detail, settings.rate, token);
        startVisemes(timeline, token);
      };
      utterance.onboundary = (boundary) => {
        dispatchLifecycle({ commandId: detail.commandId, phase: "boundary", charIndex: boundary.charIndex, charLength: boundary.charLength, elapsedTime: boundary.elapsedTime, text: detail.text, source: "browser", rate: settings.rate });
      };
      utterance.onend = () => {
        if (speechTokenRef.current !== token) return;
        clearCadence();
        clearVisemes();
        setState("idle");
        dispatchLifecycle({ commandId: detail.commandId, phase: "end", text: detail.text, source: "browser", rate: settings.rate });
      };
      utterance.onerror = () => {
        if (speechTokenRef.current !== token) return;
        clearCadence();
        clearVisemes();
        setState("stopped");
        dispatchLifecycle({ commandId: detail.commandId, phase: "error", text: detail.text, source: "browser", rate: settings.rate });
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
      speechTokenRef.current += 1;
      clearCadence();
      clearVisemes();
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", chooseVoice);
      window.removeEventListener(ISABEL_RUNTIME_EVENTS.speech, listener);
      window.removeEventListener("isabel-confirmation-resolved", confirmationListener);
    };
  }, []);

  const stop = () => {
    if (!("speechSynthesis" in window)) return;
    speechTokenRef.current += 1;
    if (cadenceTimerRef.current !== null) window.clearTimeout(cadenceTimerRef.current);
    cadenceTimerRef.current = null;
    visemeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    visemeTimersRef.current = [];
    window.dispatchEvent(new CustomEvent(VISEME_CUE_EVENT, { detail: { shape: "rest", strength: 0, durationMs: 100 } }));
    window.speechSynthesis.cancel();
    setState("stopped");
    dispatchLifecycle({ phase: "cancel", text: lastText, source: "browser" });
  };

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 40, width: 260, padding: 12, borderRadius: 12, border: "1px solid rgba(126,211,238,.28)", background: "rgba(4,9,14,.92)", color: "#dcebf1", boxShadow: "0 16px 44px rgba(0,0,0,.38)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div><div style={{ fontSize: 9, letterSpacing: ".15em", color: "#82cce5" }}>ISABEL VOICE</div><div style={{ fontSize: 12, marginTop: 3 }}>{state === "speaking" ? "Speaking now" : state}</div></div>
        <button onClick={stop} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid rgba(255,255,255,.14)", background: "#121b21", color: "white", padding: "6px 9px" }}>Stop</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "#8298a3" }}>{voiceName}</div>
      <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.35, color: "#b9cbd3", maxHeight: 46, overflow: "hidden" }}>{lastText}</div>
    </div>
  );
}
