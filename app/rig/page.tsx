"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./rig.module.css";
import { OFFICE_ANCHORS, type IsabelAnchor } from "../alive/character-contract";

type RigState = "idle" | "stand" | "walk" | "turn" | "present" | "return";

const route: Array<{ state: RigState; anchor: IsabelAnchor; ms: number; label: string }> = [
  { state: "idle", anchor: "desk-chair", ms: 2200, label: "Working at desk" },
  { state: "stand", anchor: "desk-standing", ms: 1300, label: "Standing" },
  { state: "walk", anchor: "evidence-monitor", ms: 4200, label: "Walking to evidence monitor" },
  { state: "turn", anchor: "evidence-monitor", ms: 1100, label: "Turning to user" },
  { state: "present", anchor: "evidence-monitor", ms: 3200, label: "Presenting evidence" },
  { state: "return", anchor: "desk-standing", ms: 4200, label: "Returning to desk" },
];

function projectAnchor(anchor: IsabelAnchor) {
  const point = OFFICE_ANCHORS[anchor];
  return {
    x: 50 + point.x * 10,
    y: 72 + point.z * 5,
    facing: point.facing,
  };
}

export default function IsabelRigLab() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  const current = route[step];
  const target = useMemo(() => projectAnchor(current.anchor), [current.anchor]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setStep((value) => (value + 1) % route.length), current.ms);
    return () => window.clearTimeout(timer);
  }, [current.ms, running]);

  return (
    <main className={styles.page}>
      <section className={styles.lab}>
        <header className={styles.header}>
          <div>
            <span>ISABEL · SKELETAL MOTION CONTROLLER</span>
            <h1>{current.label}</h1>
          </div>
          <b>{current.state.toUpperCase()}</b>
        </header>

        <div className={styles.room}>
          <div className={styles.wall} />
          <div className={styles.monitorWall}>
            <i>Schedule</i><i className={current.anchor === "evidence-monitor" ? styles.active : ""}>Evidence</i><i>Field</i>
          </div>
          <div className={styles.desk}>DESK</div>
          <div className={styles.path} />

          <div
            className={`${styles.rig} ${styles[current.state]}`}
            style={{ left: `${target.x}%`, top: `${target.y}%`, transform: `translate(-50%, -100%) rotateY(${target.facing}rad)` }}
            aria-label={`Isabel rig ${current.label}`}
          >
            <div className={styles.head}><i /><i /></div>
            <div className={styles.neck} />
            <div className={styles.torso}>
              <span className={styles.leftArm}><i /></span>
              <span className={styles.rightArm}><i /></span>
            </div>
            <div className={styles.hips} />
            <div className={styles.legs}>
              <span className={styles.leftLeg}><i /></span>
              <span className={styles.rightLeg}><i /></span>
            </div>
          </div>
        </div>

        <aside className={styles.console}>
          <div><span>Anchor</span><b>{current.anchor}</b></div>
          <div><span>Motion clip</span><b>{current.state}</b></div>
          <div><span>Position</span><b>{OFFICE_ANCHORS[current.anchor].x.toFixed(1)}, {OFFICE_ANCHORS[current.anchor].z.toFixed(1)}</b></div>
          <div><span>Runtime</span><b>code-driven skeletal rig</b></div>
          <button onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Resume"}</button>
          <button onClick={() => { setRunning(false); setStep((value) => (value + 1) % route.length); }}>Next</button>
          <button onClick={() => { setStep(0); setRunning(true); }}>Restart</button>
        </aside>
      </section>
    </main>
  );
}
