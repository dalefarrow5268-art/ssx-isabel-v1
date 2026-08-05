"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Perspective from "perspectivets";

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
  projective?: boolean;
  quad?: [[number, number], [number, number], [number, number], [number, number]];
};

const screens: Screen[] = [
  // Screen 01: measured to the *inner glass*, not the photographed bezel.
  // Each succeeding display will get its own four-point calibration before it
  // is made live — the same workflow as a Photoshop smart-object replacement.
  // Screen 01 is a photographed plane. These are the inner-glass corners
  // measured on the locked office plate: TL, TR, BR, BL in stage percentages.
  { id: "map", label: "Project map", kind: "map", x: 10.8, y: 9.0, w: 13.6, h: 19.2, projective: true,
    quad: [[10.8, 9.0], [24.35, 14.55], [24.35, 28.03], [10.8, 28.22]] },
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
      return <div className="map-panel"><div className="screen-title">ISABEL TOWER · SITE MAP <b>LIVE</b></div><div className="map-grid"><i className="route route-a" /><i className="route route-b" /><i className="pin pin-a" /><i className="pin pin-b" /><i className="pin pin-c" /><span>FIELD CREWS · 8</span></div></div>;
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

function mapTextureSvg(tick: number) {
  const time = `07:${String(42 + (tick % 8)).padStart(2, "0")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b2830"/><stop offset=".62" stop-color="#091b25"/><stop offset="1" stop-color="#102e32"/></linearGradient>
      <pattern id="grid" width="58" height="58" patternUnits="userSpaceOnUse" patternTransform="rotate(24)"><path d="M0 0H58M0 29H58" stroke="#4e8993" stroke-opacity=".2" stroke-width="2"/></pattern>
      <filter id="glow"><feGaussianBlur stdDeviation="9" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="50" y="54" width="1100" height="692" rx="2" fill="url(#panel)" stroke="#5e9aaa" stroke-opacity=".55" stroke-width="3"/>
    <text x="84" y="104" fill="#9bc2cc" font-family="Arial,Helvetica,sans-serif" font-size="35" font-weight="700" letter-spacing="4">ISABEL TOWER · SITE MAP</text>
    <text x="1088" y="104" text-anchor="end" fill="#7ee0aa" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" letter-spacing="3">LIVE</text>
    <rect x="82" y="140" width="1036" height="558" fill="url(#grid)" stroke="#5594a0" stroke-opacity=".35" stroke-width="2"/>
    <path d="M118 310 L655 645" fill="none" stroke="#e7b94f" stroke-width="8" filter="url(#glow)"/>
    <path d="M260 620 L890 238" fill="none" stroke="#63c9d6" stroke-width="7" filter="url(#glow)"/>
    <g fill="#f8ca5d" filter="url(#glow)"><circle cx="300" cy="280" r="10"/><circle cx="710" cy="395" r="9"/><circle cx="910" cy="490" r="9"/></g>
    <g fill="#73a875" fill-opacity=".32"><circle cx="456" cy="322" r="37"/><circle cx="804" cy="235" r="29"/><circle cx="255" cy="585" r="42"/></g>
    <text x="1038" y="672" text-anchor="end" fill="#c9e2de" font-family="Arial,Helvetica,sans-serif" font-size="28" letter-spacing="3">FIELD CREWS · 8</text>
    <text x="84" y="724" fill="#648b97" font-family="Arial,Helvetica,sans-serif" font-size="20" letter-spacing="2">SYNCED ${time} · NORTH TOWER</text>
  </svg>`;
}

function Screen01Canvas({ tick, viewport }: { tick: number; viewport: { width: number; height: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width < 2 || viewport.height < 2) return;

    let cancelled = false;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewport.width * pixelRatio);
    canvas.height = Math.round(viewport.height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const perspective = new Perspective(context, image);
      perspective.draw({
        topLeftX: viewport.width * 0.108 * pixelRatio,
        topLeftY: viewport.height * 0.09 * pixelRatio,
        topRightX: viewport.width * 0.2435 * pixelRatio,
        topRightY: viewport.height * 0.1455 * pixelRatio,
        bottomRightX: viewport.width * 0.2435 * pixelRatio,
        bottomRightY: viewport.height * 0.2803 * pixelRatio,
        bottomLeftX: viewport.width * 0.108 * pixelRatio,
        bottomLeftY: viewport.height * 0.2822 * pixelRatio,
      });
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mapTextureSvg(tick))}`;

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [tick, viewport]);

  return <canvas ref={canvasRef} className="screen-01-canvas" aria-label="Screen 01 Isabel Tower site map" />;
}

export default function Home() {
  const tick = useProjectPulse();
  const [view, setView] = useState<View>("arrival");
  const [focusedScreen, setFocusedScreen] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
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
          <Screen01Canvas tick={tick} viewport={viewport} />
          <button
            className={`map-hit-area ${focusedScreen === "map" ? "screen-focused" : ""}`}
            onClick={() => { setFocusedScreen("map"); setView("wall"); }}
            aria-label="Focus Screen 01 Isabel Tower site map"
          />
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
