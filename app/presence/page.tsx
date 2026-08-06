"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./presence.module.css";

type PresenceState =
  | "working"
  | "noticing"
  | "welcoming"
  | "presenting"
  | "listening"
  | "returning";

const sequence: Array<{ state: PresenceState; duration: number }> = [
  { state: "working", duration: 2600 },
  { state: "noticing", duration: 1200 },
  { state: "welcoming", duration: 3300 },
  { state: "presenting", duration: 3900 },
  { state: "listening", duration: 3200 },
  { state: "returning", duration: 1700 },
];

const copy: Record<PresenceState, { eyebrow: string; title: string; speech: string; gaze: string }> = {
  working: {
    eyebrow: "PRESENCE · WORKING",
    title: "Isabel is reviewing the morning brief.",
    speech: "",
    gaze: "schedule monitor",
  },
  noticing: {
    eyebrow: "PRESENCE · USER DETECTED",
    title: "She notices that you have arrived.",
    speech: "",
    gaze: "you",
  },
  welcoming: {
    eyebrow: "PRESENCE · WELCOMING",
    title: "Good morning, Dale.",
    speech: "I have your morning briefing ready. Two items deserve your attention first.",
    gaze: "you",
  },
  presenting: {
    eyebrow: "PRESENCE · PRESENTING",
    title: "The storefront anchorage issue is first.",
    speech: "The install window is approaching, but the supporting detail is still unresolved. I linked the RFI, schedule activity, and owner meeting note on the evidence screen.",
    gaze: "evidence monitor",
  },
  listening: {
    eyebrow: "PRESENCE · LISTENING",
    title: "Isabel is listening.",
    speech: "",
    gaze: "you",
  },
  returning: {
    eyebrow: "PRESENCE · RETURNING",
    title: "She returns to the work in progress.",
    speech: "",
    gaze: "schedule monitor",
  },
};

export default function PresenceProof() {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const current = sequence[index];
  const stateCopy = copy[current.state];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % sequence.length);
    }, current.duration);
    return () => window.clearTimeout(timer);
  }, [current.duration, running]);

  const progress = useMemo(() => ((index + 1) / sequence.length) * 100, [index]);

  return (
    <main className={`${styles.page} ${styles[current.state]}`}>
      <section className={styles.stage} aria-label="Isabel controlled presence proof">
        <img className={styles.office} src="/isabel-office-screen01.jpg?presence=v1" alt="Isabel working in her SSX office" />
        <div className={styles.vignette} />
        <div className={styles.focusWash} />
        <div className={styles.gazeLine} aria-hidden="true" />

        <aside className={styles.director}>
          <span>{stateCopy.eyebrow}</span>
          <h1>{stateCopy.title}</h1>
          {stateCopy.speech ? <p>“{stateCopy.speech}”</p> : <p className={styles.quiet}>No speech. Natural room presence continues.</p>}
          <dl>
            <div><dt>Gaze target</dt><dd>{stateCopy.gaze}</dd></div>
            <div><dt>Behavior state</dt><dd>{current.state}</dd></div>
            <div><dt>Authority</dt><dd>read and present only</dd></div>
          </dl>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          <div className={styles.controls}>
            <button onClick={() => setRunning((value) => !value)}>{running ? "Pause sequence" : "Resume sequence"}</button>
            <button onClick={() => { setRunning(false); setIndex((value) => (value + 1) % sequence.length); }}>Next state</button>
            <button onClick={() => { setIndex(0); setRunning(true); }}>Restart</button>
          </div>
        </aside>

        <div className={styles.signal} aria-live="polite">
          <i />
          <span>ISABEL PRESENCE DIRECTOR</span>
          <b>{current.state.toUpperCase()}</b>
        </div>
      </section>
    </main>
  );
}
