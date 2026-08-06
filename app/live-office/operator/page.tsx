'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type GateStatus,
  type OperatorAction,
  type OperatorStatusMessage,
  isOperatorStatusMessage,
  makeOperatorCommand,
} from './operator-protocol';

const DEFAULT_SUBSYSTEMS = [
  ['machine', 'Machine discovery'],
  ['health', 'Project health'],
  ['unreal', 'Unreal runtime'],
  ['streaming', 'Pixel Streaming'],
  ['character', 'Isabel character'],
  ['identity', 'Identity lock'],
  ['geometry', 'Office geometry lock'],
  ['camera', 'Camera lock'],
  ['screens', 'Four live screens'],
  ['bridge', 'Browser ↔ Unreal bridge'],
  ['voice', 'Voice / barge-in'],
  ['continuity', 'Session continuity'],
  ['smoke', 'Runtime smoke test'],
  ['adversarial', 'Adversarial benchmark'],
  ['rehearsal', 'Live rehearsal'],
] as const;

const STATUS_TONE: Record<GateStatus, string> = {
  WAITING: '#8d96a8',
  RUNNING: '#d8ad4d',
  PASS: '#72c792',
  DEGRADED: '#e2bb61',
  BLOCKED: '#df7777',
};

export default function IsabelOperatorPage() {
  const streamUrl = useMemo(() => process.env.NEXT_PUBLIC_ISABEL_STREAM_URL || '', []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [lastAction, setLastAction] = useState<OperatorAction | null>(null);
  const [status, setStatus] = useState<OperatorStatusMessage>({
    source: 'ssx-isabel-runtime',
    version: 1,
    type: 'operator-status',
    overall: 'WAITING',
    liveAllowed: false,
    sessionState: 'WAITING FOR RUNTIME',
    message: 'No commissioning evidence received from the home runtime yet.',
    subsystems: DEFAULT_SUBSYSTEMS.map(([id, label]) => ({ id, label, status: 'WAITING' as GateStatus })),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (isOperatorStatusMessage(event.data)) {
        setStatus(event.data);
        setBridgeReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const send = (action: OperatorAction) => {
    const command = makeOperatorCommand(action);
    setLastAction(action);
    window.dispatchEvent(new CustomEvent('isabel-operator-command', { detail: command }));
    iframeRef.current?.contentWindow?.postMessage(command, '*');
  };

  const liveBlocked = !status.liveAllowed || status.overall === 'BLOCKED';

  return (
    <main style={{ minHeight: '100vh', background: '#0b0d11', color: '#f5f6f8', fontFamily: 'Arial, sans-serif', padding: 22 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.6, opacity: 0.65 }}>SSX • ISABEL • COMMISSIONING</div>
            <h1 style={{ margin: '6px 0 5px', fontSize: 30 }}>Live Demo Operator Panel</h1>
            <div style={{ opacity: 0.7, lineHeight: 1.5 }}>Operator surface for commissioning, health, rehearsal, and final LIVE authorization.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: STATUS_TONE[status.overall] }}>{status.overall}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Bridge: {bridgeReady ? 'CONNECTED' : 'WAITING'}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Session: {status.sessionState || 'UNKNOWN'}</div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(330px, 0.8fr)', gap: 16 }}>
          <section style={{ border: '1px solid #2b3038', background: '#11151b' }}>
            <div style={{ aspectRatio: '16 / 9', position: 'relative', overflow: 'hidden', background: '#090b0e' }}>
              {streamUrl ? (
                <iframe
                  ref={iframeRef}
                  title="Isabel Live Office Runtime"
                  src={streamUrl}
                  allow="autoplay; microphone; camera; fullscreen"
                  onLoad={() => setBridgeReady(true)}
                  style={{ width: '100%', height: '100%', border: 0 }}
                />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>Runtime viewport waiting</div>
                    <div style={{ opacity: 0.65, maxWidth: 620, lineHeight: 1.55 }}>
                      This panel does not fake a renderer. The Unreal viewport appears here only after the home GPU machine exposes the configured Pixel Streaming endpoint.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 14, borderTop: '1px solid #2b3038' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {([
                  ['Refresh Status', 'REFRESH_STATUS'],
                  ['Health Report', 'RUN_HEALTH_REPORT'],
                  ['Runtime Smoke', 'RUN_RUNTIME_SMOKE'],
                  ['Adversarial', 'RUN_ADVERSARIAL_BENCHMARK'],
                  ['Commissioning', 'RUN_COMMISSIONING_DASHBOARD'],
                  ['Live Rehearsal', 'RUN_LIVE_REHEARSAL'],
                ] as const).map(([label, action]) => (
                  <button key={action} onClick={() => send(action)} style={buttonStyle(false)}>{label}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  disabled={liveBlocked}
                  onClick={() => send('OPEN_LIVE_SESSION')}
                  style={buttonStyle(liveBlocked, status.liveAllowed ? '#1e4e31' : undefined)}
                >
                  OPEN LIVE SESSION
                </button>
                <button onClick={() => send('CLOSE_LIVE_SESSION')} style={buttonStyle(false)}>Close Session</button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.62, marginTop: 10 }}>
                Last operator action: {lastAction || 'none'} • LIVE stays disabled until runtime evidence explicitly authorizes it.
              </div>
            </div>
          </section>

          <aside style={{ border: '1px solid #2b3038', background: '#11151b', padding: 14 }}>
            <div style={{ fontSize: 13, letterSpacing: 1.2, opacity: 0.68, marginBottom: 10 }}>COMMISSIONING EVIDENCE</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {status.subsystems.map((item) => (
                <div key={item.id} style={{ border: '1px solid #292e35', background: '#0d1015', padding: '9px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{item.label}</span>
                    <strong style={{ fontSize: 11, color: STATUS_TONE[item.status] }}>{item.status}</strong>
                  </div>
                  {item.detail ? <div style={{ fontSize: 11, opacity: 0.62, marginTop: 4, lineHeight: 1.4 }}>{item.detail}</div> : null}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: 11, border: `1px solid ${STATUS_TONE[status.overall]}55`, background: '#0d1015' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Current gate decision</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.8 }}>{status.message || 'Waiting for runtime status.'}</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 7 }}>Updated: {status.updatedAt}</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function buttonStyle(disabled: boolean, background?: string): React.CSSProperties {
  return {
    padding: '10px 13px',
    border: '1px solid #3a414b',
    background: disabled ? '#181b20' : (background || '#171c23'),
    color: disabled ? '#707784' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 650,
    letterSpacing: 0.2,
  };
}
