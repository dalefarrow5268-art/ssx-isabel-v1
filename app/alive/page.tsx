"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./alive.module.css";

type IsabelState = "working" | "noticing" | "welcoming" | "presenting" | "listening" | "returning";

const states: Array<{ id: IsabelState; ms: number; title: string; speech?: string; gaze: string }> = [
  { id: "working", ms: 2800, title: "Reviewing the morning briefing", gaze: "schedule" },
  { id: "noticing", ms: 1200, title: "User arrival detected", gaze: "user" },
  { id: "welcoming", ms: 3600, title: "Good morning, Dale", speech: "I have your morning briefing ready. Two items deserve your attention first.", gaze: "user" },
  { id: "presenting", ms: 4600, title: "Presenting linked evidence", speech: "The storefront anchorage issue is first. I linked the RFI, schedule activity, and owner meeting note.", gaze: "evidence" },
  { id: "listening", ms: 3200, title: "Listening for your direction", gaze: "user" },
  { id: "returning", ms: 1800, title: "Returning to work", gaze: "schedule" },
];

export default function IsabelAlive() {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [voiceEnergy, setVoiceEnergy] = useState(0);
  const current = states[index];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % states.length), current.ms);
    return () => window.clearTimeout(timer);
  }, [current.ms, running]);

  useEffect(() => {
    if (!current.speech) {
      setVoiceEnergy(0);
      return;
    }
    const interval = window.setInterval(() => setVoiceEnergy(Math.random()), 95);
    return () => window.clearInterval(interval);
  }, [current.speech]);

  const progress = useMemo(() => ((index + 1) / states.length) * 100, [index]);

  return (
    <main className={`${styles.page} ${styles[current.id]}`}>
      <section className={styles.office} aria-label="Identity locked Isabel motion laboratory">
        <div className={styles.architecture} aria-hidden="true">
          <div className={styles.windowWall} />
          <div className={styles.monitorWall}>
            <div className={`${styles.monitor} ${current.gaze === "schedule" ? styles.activeMonitor : ""}`}><span>CRITICAL PATH</span><b>18 DAYS FLOAT</b></div>
            <div className={`${styles.monitor} ${current.gaze === "evidence" ? styles.activeMonitor : ""}`}><span>EVIDENCE</span><b>3 LINKED SOURCES</b></div>
            <div className={styles.monitor}><span>FIELD</span><b>8 CREWS ACTIVE</b></div>
          </div>
          <div className={styles.desk} />
        </div>

        <div className={styles.characterStage}>
          <div className={styles.characterRig} data-state={current.id}>
            <img className={styles.identity} src="/isabel-identity-lock.jpeg" alt="Isabel approved identity reference" />
            <div className={styles.leftLid} aria-hidden="true" />
            <div className={styles.rightLid} aria-hidden="true" />
            <div className={styles.mouthRig} aria-hidden="true" style={{ transform: `translateX(-50%) scaleY(${current.speech ? 0.45 + voiceEnergy * 0.85 : 0.12})` }} />
            <div className={styles.breathLight} aria-hidden="true" />
          </div>
        </div>

        <aside className={styles.console}>
          <span>ISABEL · IDENTITY-LOCKED MOTION HARNESS</span>
          <h1>{current.title}</h1>
          <p>{current.speech ? `“${current.speech}”` : "No speech. Natural breathing, blinking and attention remain active."}</p>
          <dl>
            <div><dt>Face authority</dt><dd>approved Isabel headshot</dd></div>
            <div><dt>Behavior state</dt><dd>{current.id}</dd></div>
            <div><dt>Gaze target</dt><dd>{current.gaze}</dd></div>
            <div><dt>Runtime</dt><dd>code-driven 2.5D rig</dd></div>
          </dl>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          <div className={styles.controls}>
            <button onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Resume"}</button>
            <button onClick={() => { setRunning(false); setIndex((value) => (value + 1) % states.length); }}>Next state</button>
            <button onClick={() => { setIndex(0); setRunning(true); }}>Restart</button>
          </div>
        </aside>

        <div className={styles.status}><i /><span>FACE LOCKED</span><b>{current.id.toUpperCase()}</b></div>
      </section>
    </main>
  );
}
