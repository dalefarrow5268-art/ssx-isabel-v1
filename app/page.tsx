"use client";

import { useMemo, useState } from "react";

const stations = ["Briefing", "Weather", "Draft", "Confirm", "Memory", "Activity"] as const;
type Station = (typeof stations)[number];

const evidence = [
  { id: "rfi-117", kind: "RFI", title: "RFI-117 anchorage clarification", note: "Level 2 storefront anchorage detail changed; submittal revision may be required.", source: "Procore · 06:42" },
  { id: "sched-44", kind: "Schedule", title: "Schedule Update 44", note: "Storefront installation begins in 18 calendar days.", source: "P6 import · 06:51" },
  { id: "mins-21", kind: "Minutes", title: "Owner coordination minutes", note: "Written confirmation requested before schedule-impacting messages.", source: "Meeting note · 07:04" },
];

const briefing = [
  { level: "Critical", title: "Storefront anchorage may affect fabrication release", owner: "Maya Chen", why: "RFI-117 and the 18-day install window create schedule exposure.", residue: "Confirm fabrication hold status by 2:00 PM." },
  { level: "Decision", title: "Owner-facing message needs written confirmation", owner: "You", why: "The owner asked for backup before schedule-impacting coordination.", residue: "Queue the draft only after human approval." },
  { level: "Blocked", title: "Weather may affect exterior work tomorrow", owner: "Carlos Vega", why: "Rain risk exists, but field impact has not been confirmed.", residue: "Wait for superintendent field update." },
];

const toneVariants = {
  Professional: "At this point, I am treating this as a coordination risk, not a confirmed delay.",
  Firmer: "Please confirm today whether the revised detail changes fabrication release or creates schedule exposure.",
  Warmer: "I appreciate the quick confirmation so we can keep the team aligned before this becomes schedule-sensitive.",
};

const stationCopy = {
  Briefing: "She is standing at the evidence wall, ranking the morning by consequence.",
  Weather: "She checks the field/weather board before exterior work becomes a schedule problem.",
  Draft: "She walks to the writing desk and shapes the owner message with evidence attached.",
  Confirm: "She stops at the authority table. Nothing leaves the room without your approval.",
  Memory: "She opens the memory vault and asks what should become durable context.",
  Activity: "She turns to the audit board so you can inspect every action residue.",
};

const weather = [
  { label: "Exterior work", value: "At risk", note: "Storefront install is close enough that rain could force resequencing." },
  { label: "Lift / glazing", value: "Check limits", note: "Wind handling limits need Carlos’s field read before escalation." },
  { label: "Confidence", value: "Blocked", note: "Weather forecast is known. Actual field impact is not confirmed." },
];

const activity = [
  { time: "07:30", title: "Opened the office", detail: "Isabel began sorting project signals before the user arrived." },
  { time: "07:34", title: "Pinned evidence", detail: "RFI, schedule, and meeting notes linked to the same risk thread." },
  { time: "07:38", title: "Drafted owner language", detail: "Tone remains adjustable and source-backed." },
  { time: "07:41", title: "Held external action", detail: "Live send remains blocked until explicit confirmation." },
];

export default function Home() {
  const [station, setStation] = useState<Station>("Briefing");
  const [tone, setTone] = useState("Professional");
  const [confirmed, setConfirmed] = useState(false);
  const [memory, setMemory] = useState("Pending");
  const [entered, setEntered] = useState(false);
  const [focusedEvidence, setFocusedEvidence] = useState(evidence[0].id);
  const selectedEvidence = useMemo(() => evidence.find(item => item.id === focusedEvidence) ?? evidence[0], [focusedEvidence]);

  return (
    <main className={entered ? "office entered" : "office"}>
      <section className="office-scene" aria-label="SSX Isabel office">
        <div className="ceiling-grid" />
        <div className="city-window"><span>SSX HQ · 07:42</span></div>
        <div className="glass-wall">
          <b>SCOUT ENGINE</b>
          <span>personality</span>
          <span>memory</span>
          <span>evidence</span>
        </div>

        <div className="room-map">
          <b>SSX rooms</b>
          <span className="current">Control center</span>
          <span>Weather room</span>
          <span>Drafting room</span>
          <span>Memory vault</span>
        </div>

        <button className="door" onClick={() => setEntered(true)}>
          <span>{entered ? "You are in the office" : "Enter Isabel’s office"}</span>
        </button>

        <div className="station evidence-station">
          <span>Evidence wall</span>
          {evidence.map(item => (
            <button key={item.id} className={focusedEvidence === item.id ? "evidence-chip active" : "evidence-chip"} onClick={() => { setFocusedEvidence(item.id); setStation("Briefing"); }}>
              {item.kind}
            </button>
          ))}
        </div>

        <button className={station === "Draft" ? "station desk active" : "station desk"} onClick={() => setStation("Draft")}>
          <span>Writing desk</span>
          <b>Owner draft</b>
        </button>

        <button className={station === "Weather" ? "station weather active" : "station weather"} onClick={() => setStation("Weather")}>
          <span>Weather board</span>
          <b>64% rain risk</b>
        </button>

        <button className={station === "Confirm" ? "station authority active" : "station authority"} onClick={() => setStation("Confirm")}>
          <span>Authority table</span>
          <b>{confirmed ? "Queued" : "Waiting"}</b>
        </button>

        <button className={station === "Memory" ? "station vault active" : "station vault"} onClick={() => setStation("Memory")}>
          <span>Memory vault</span>
          <b>{memory}</b>
        </button>

        <button className={station === "Activity" ? "station audit active" : "station audit"} onClick={() => setStation("Activity")}>
          <span>Audit board</span>
          <b>4 events</b>
        </button>

        <div className={`isabel ${entered ? "noticed" : ""} at-${station.toLowerCase()}`} aria-label="Isabel in the SSX office">
          <div className="isabel-standin">
            <span />
            <b>ISABEL</b>
          </div>
          <i />
        </div>

        <div className="floor-shadow" />
      </section>

      <section className="control-panel">
        <header>
          <div>
            <span className="kicker">ISABEL V1 · OFFICE MODE</span>
            <h1>{entered ? "She noticed you walk in." : "She is already working."}</h1>
            <p>{entered ? stationCopy[station] : "The screen is her SSX office. She moves through the room, prepares work, and waits for you to step in."}</p>
          </div>
          <div className="status">
            <b>{entered ? "USER PRESENT" : "PRE-ARRIVAL"}</b>
            <span>Memory: {memory}</span>
          </div>
        </header>

        <nav aria-label="Office stations">
          {stations.map(item => (
            <button key={item} className={station === item ? "active" : ""} onClick={() => setStation(item)}>{item}</button>
          ))}
        </nav>

        {station === "Briefing" && (
          <div className="briefing-board">
            <section className="source-card">
              <span>Focused source</span>
              <h2>{selectedEvidence.title}</h2>
              <p>{selectedEvidence.note}</p>
              <small>{selectedEvidence.source}</small>
            </section>
            {briefing.map((item, index) => (
              <article className="briefing-item" key={item.title}>
                <b>0{index + 1}</b>
                <div>
                  <span>{item.level} · {item.owner}</span>
                  <h3>{item.title}</h3>
                  <p>{item.why}</p>
                  <small>{item.residue}</small>
                </div>
              </article>
            ))}
          </div>
        )}

        {station === "Weather" && (
          <div className="weather-room">
            <section className="weather-hero">
              <span>Field/weather board</span>
              <h2>Weather is a watch item, not a delay yet.</h2>
              <p>Isabel keeps the weather board visible because exterior storefront work is close, but she does not escalate until site impact is confirmed.</p>
              <div className="radar-wall">
                <i />
                <b>ISABEL TOWER</b>
                <em>Rain band · tomorrow AM</em>
              </div>
            </section>
            {weather.map(item => (
              <article key={item.label}>
                <span>{item.label}</span>
                <h3>{item.value}</h3>
                <p>{item.note}</p>
              </article>
            ))}
            <div className="field-action">
              <span>Recommended next move</span>
              <b>Ask Carlos for alternate exterior sequence before the afternoon meeting.</b>
              <button>Request field confirmation</button>
            </div>
          </div>
        )}

        {station === "Draft" && (
          <div className="draft-room">
            <article className="document">
              <span>Owner message on Isabel’s desk</span>
              <h2>Storefront anchorage clarification and schedule check</h2>
              <p>John,</p>
              <p>We are reviewing the RFI-117 response regarding the Level 2 storefront anchorage detail. Because storefront installation is scheduled to begin in 18 days, we are confirming whether the revised detail affects fabrication release.</p>
              <p>I will update you once we confirm any schedule exposure. {toneVariants[tone as keyof typeof toneVariants]}</p>
              <p>Respectfully,<br />SSX</p>
            </article>
            <aside className="tone-rack">
              <span>Tone Isabel can apply</span>
              {Object.keys(toneVariants).map(item => <button key={item} className={tone === item ? "active" : ""} onClick={() => setTone(item)}>{item}</button>)}
            </aside>
          </div>
        )}

        {station === "Confirm" && (
          <div className="confirm-room">
            <div>
              <span>External action boundary</span>
              <h2>Queue owner message and create Maya’s follow-up task?</h2>
              <p>Isabel can prepare everything in the room, but no email, task, or memory write leaves without human authority.</p>
            </div>
            <div className="checks"><span>Evidence attached</span><span>Human confirmation</span><span>Task residue</span><span>Audit event</span></div>
            <div className="actions"><button onClick={() => setConfirmed(false)}>Hold</button><button onClick={() => setConfirmed(true)}>{confirmed ? "Queued" : "Confirm"}</button></div>
          </div>
        )}

        {station === "Memory" && (
          <div className="memory-room">
            <article>
              <span>Proposed durable memory</span>
              <h2>John Ramirez prefers written confirmation before schedule-impacting coordination messages.</h2>
              <p>Store this only as project-bound relationship context. It can improve Isabel’s future behavior without becoming hidden or permanent.</p>
            </article>
            <div className="actions"><button onClick={() => setMemory("Declined")}>Decline</button><button onClick={() => setMemory("Approved")}>Approve memory</button></div>
          </div>
        )}

        {station === "Activity" && (
          <div className="activity-room">
            {activity.map(item => (
              <article key={item.title}>
                <time>{item.time}</time>
                <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
