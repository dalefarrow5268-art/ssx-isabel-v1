"use client";

import { useEffect, useMemo, useState } from "react";

type View = "arrival" | "wall" | "desk" | "table";
type ScreenKind = "map" | "schedule" | "weather" | "cameras" | "evidence" | "risk" | "audit" | "field" | "forecast" | "lookahead";

type Screen = {
  id: string;
  label: string;
  kind: ScreenKind;
  x: number;
  y: number;
  w: number;
  h: number;
  skew?: number;
};

const screens: Screen[] = [
  { id: "map", label: "Project map", kind: "map", x: 10.7, y: 9.1, w: 16.7, h: 18.8, skew: -1.5 },
  { id: "schedule", label: "Critical path", kind: "schedule", x: 27.7, y: 10.7, w: 11.0, h: 17.2, skew: -1 },
  { id: "lookahead", label: "14 day lookahead", kind: "lookahead", x: 38.9, y: 11.7, w: 11.0, h: 16.1, skew: -0.4 },
  { id: "cameras", label: "Field cameras", kind: "cameras", x: 50.0, y: 12.6, w: 11.0, h: 15.2, skew: 0.2 },
  { id: "forecast", label: "Weather forecast", kind: "forecast", x: 61.1, y: 13.2, w: 10.6, h: 14.7, skew: 0.8 },
  { id: "evidence", label: "Evidence wall", kind: "evidence", x: 10.7, y: 28.4, w: 16.7, h: 16.0, skew: -1.2 },
  { id: "field", label: "Site progress", kind: "field", x: 27.8, y: 28.3, w: 11.0, h: 16.0, skew: -0.6 },
  { id: "risk", label: "Risk register", kind: "risk", x: 39.0, y: 28.3, w: 10.9, h: 16.0, skew: -0.1 },
  { id: "audit", label: "Activity stream", kind: "audit", x: 50.1, y: 28.3, w: 11.0, h: 16.0, skew: 0.4 },
  { id: "weather", label: "Weather radar", kind: "weather", x: 61.2, y: 28.4, w: 10.5, h: 15.9, skew: 1 },
];

// Visual-effects workflow: we only replace a photographed surface after its
// real-world bounds are fitted and approved. The rest of the room remains the
// locked architectural plate until its turn.
const fittedScreenIds = new Set(["map"]);

const statusCopy = [
  "RFI-117 linked to the storefront risk thread.",
  "Field camera 03 refreshed 14 seconds ago.",
  "Tomorrow AM rain remains a watch item, not a delay.",
  "Critical path review is prepared for Isabel.",
];

function useProjectPulse() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const pulse = window.setInterval(() => setTick((current) => current + 1), 4200);
    return () => window.clearInterval(pulse);
  }, []);

  return tick;
}

function MiniChart({ seed, color = "#65d3a1" }: { seed: number; color?: string }) {
  const bars = useMemo(() => Array.from({ length: 9 }, (_, index) => 22 + ((index * 17 + seed * 13) % 63)), [seed]);
  return (
    <div className="mini-chart" aria-hidden="true">
      {bars.map((height, index) => <i key={index} style={{ height: `${height}%`, backgroundColor: color }} />)}
    </div>
  );
}

function ScreenContent({ kind, tick }: { kind: ScreenKind; tick: number }) {
  const time = `07:${String(42 + (tick % 8)).padStart(2, "0")}`;
  switch (kind) {
    case "map":
      return <><div className="screen-title">ISABEL TOWER · SITE MAP <b>LIVE</b></div><div className="map-grid"><i className="route route-a" /><i className="route route-b" /><i className="pin pin-a" /><i className="pin pin-b" /><i className="pin pin-c" /><span>FIELD CREWS · 8</span></div></>;
    case "schedule":
      return <><div className="screen-title">CRITICAL PATH <b>LIVE</b></div><div className="gantt"><i /><i /><i /><i /><i /><i /></div><div className="screen-footer"><span>FLOAT</span><b>18 DAYS</b></div></>;
    case "lookahead":
      return <><div className="screen-title">14 DAY LOOKAHEAD</div><MiniChart seed={tick} color="#73bff2" /><div className="screen-footer"><span>WORKFRONTS</span><b>12 ACTIVE</b></div></>;
    case "cameras":
      return <><div className="screen-title">FIELD CAMERAS <b>STREAM</b></div><div className="camera-grid"><i /><i /><i /><i /></div><div className="screen-footer"><span>CAM 03</span><b>{time}</b></div></>;
    case "forecast":
      return <><div className="screen-title">SITE WEATHER</div><div className="forecast"><b>72°</b><span>Tomorrow AM</span><i>64%</i></div><div className="weather-days"><em>NOW</em><em>AM</em><em>PM</em><em>THU</em></div></>;
    case "evidence":
      return <><div className="screen-title">EVIDENCE BOARD</div><div className="evidence-list"><i><b>RFI-117</b><span>Anchorage detail</span></i><i><b>SCHED 44</b><span>Install window</span></i><i><b>MIN 21</b><span>Owner confirmation</span></i></div><div className="screen-footer"><span>LINKED</span><b>3 SOURCES</b></div></>;
    case "field":
      return <><div className="screen-title">SITE PROGRESS</div><div className="site-photo"><i /><i /><b>WEST ELEVATION</b></div><MiniChart seed={tick + 2} color="#e1a95a" /></>;
    case "risk":
      return <><div className="screen-title">RISK REGISTER <b>4 OPEN</b></div><div className="risk-list"><i><span>ANCHORAGE</span><b>HIGH</b></i><i><span>WEATHER</span><b>WATCH</b></i><i><span>LOGISTICS</span><b>LOW</b></i></div><div className="screen-footer"><span>CONFIDENCE</span><b>BLOCKED</b></div></>;
    case "audit":
      return <><div className="screen-title">ACTIVITY STREAM <b>LIVE</b></div><div className="audit-list"><i><em>07:41</em><span>Evidence linked</span></i><i><em>07:38</em><span>Draft prepared</span></i><i><em>07:34</em><span>Weather checked</span></i></div><div className="screen-footer"><span>OPEN EVENTS</span><b>4</b></div></>;
    case "weather":
      return <><div className="screen-title">RADAR · 18H</div><div className="radar"><i /><i /><i /><b /></div><div className="screen-footer"><span>RAIN RISK</span><b>64%</b></div></>;
  }
}

export default function Home() {
  const tick = useProjectPulse();
  const [view, setView] = useState<View>("arrival");
  const [focusedScreen, setFocusedScreen] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  const activeMessage = statusCopy[tick % statusCopy.length];

  return (
    <main className={`office-cinema view-${view} ${present ? "user-present" : ""}`}>
      <section className="office-stage" aria-label="Isabel's SSX construction operations office">
        <img
          className="office-plate"
          src="/isabel-office-final.jpg?scene=final"
          alt="Isabel's construction operations office"
        />
        <div className="daylight" aria-hidden="true" />
        <div className="screen-wall" aria-label="Live SSX project operations wall">
          {screens.filter((screen) => fittedScreenIds.has(screen.id)).map((screen) => (
            <button
              key={screen.id}
              className={`live-screen ${screen.kind} ${focusedScreen === screen.id ? "screen-focused" : ""}`}
              style={{ left: `${screen.x}%`, top: `${screen.y}%`, width: `${screen.w}%`, height: `${screen.h}%`, "--skew": `${screen.skew ?? 0}deg` } as React.CSSProperties}
              onClick={() => { setFocusedScreen(screen.id); setView("wall"); }}
              aria-label={`Focus ${screen.label}`}
            >
              <ScreenContent kind={screen.kind} tick={tick} />
              <span className="screen-reflection" aria-hidden="true" />
            </button>
          ))}
        </div>

        <button className="room-zone desk-zone" onClick={() => setView("desk")} aria-label="Move closer to Isabel's desk" />
        <button className="room-zone table-zone" onClick={() => setView("table")} aria-label="Move to the collaboration table" />
        <button className="room-zone entry-zone" onClick={() => { setPresent(true); setView("arrival"); }} aria-label="Enter Isabel's office" />
        <button className="room-zone reset-zone" onClick={() => { setView("arrival"); setFocusedScreen(null); }} aria-label="Return to the office entrance" />

        <div className="office-presence" aria-live="polite">
          <span className="presence-dot" />
          <span>{present ? "ISABEL IS WITH YOU" : "ISABEL IS WORKING"}</span>
          <b>{activeMessage}</b>
        </div>
        <p className="sr-only">The office is alive. Project screens refresh continuously. Select a display to inspect the curved command wall, Isabel&apos;s desk, or the collaboration table.</p>
      </section>
    </main>
  );
}
