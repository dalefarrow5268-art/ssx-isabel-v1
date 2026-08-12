'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BrowserOfficeStage from './BrowserOfficeStage';
import { CloudflareIsabelCoreBridge, type CoreConnectionState, type IsabelCoreState } from './cloudflare-core-bridge';
import type { OfficeCommand } from './protocol';

const INITIAL_STATE: IsabelCoreState = {
  version: 1,
  revision: 0,
  presence: 'offline',
  sessionState: 'idle',
  pose: 'standing',
  anchor: 'ISABEL_DESK_STAND',
  gaze: 'neutral',
  activity: 'IDLE_WORK',
  liveAllowed: false,
  activeProject: null,
  activeThread: null,
  updatedAt: null,
};

const COMMANDS = [
  ['Look at User', 'LOOK_AT_USER'],
  ['Work at Desk', 'IDLE_WORK'],
  ['Sit', 'SIT_AT_DESK'],
  ['Stand', 'STAND_FROM_DESK'],
  ['Desk', 'GO_TO_DESK'],
  ['Screen 1', 'GO_TO_SCREEN_01'],
  ['Screen 2', 'GO_TO_SCREEN_02'],
  ['Screen 3', 'GO_TO_SCREEN_03'],
  ['Screen 4', 'GO_TO_SCREEN_04'],
] as const satisfies ReadonlyArray<readonly [string, OfficeCommand]>;

function getSessionId() {
  if (typeof window === 'undefined') return 'browser-preview';
  const existing = window.localStorage.getItem('ssx-isabel-session-id');
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
  window.localStorage.setItem('ssx-isabel-session-id', created);
  return created;
}

function previewState(state: IsabelCoreState, command: OfficeCommand): IsabelCoreState {
  const next = { ...state, revision: state.revision + 1, activity: command, updatedAt: new Date().toISOString() };
  if (command === 'LOOK_AT_USER') next.gaze = 'user';
  if (command === 'IDLE_WORK') next.gaze = 'work';
  if (command === 'GO_TO_DESK' || command === 'STAND_FROM_DESK') { next.anchor = 'ISABEL_DESK_STAND'; next.pose = 'standing'; }
  if (command === 'SIT_AT_DESK') { next.anchor = 'ISABEL_DESK_SEATED'; next.pose = 'seated'; }
  if (command.startsWith('GO_TO_SCREEN_')) { next.anchor = `${command.replace('GO_TO_', '')}_VIEW`; next.pose = 'standing'; }
  return next;
}

export default function LiveOfficePage() {
  const coreUrl = useMemo(() => process.env.NEXT_PUBLIC_ISABEL_CORE_URL || '', []);
  const bridgeRef = useRef<CloudflareIsabelCoreBridge | null>(null);
  const [coreState, setCoreState] = useState<IsabelCoreState>(INITIAL_STATE);
  const [connection, setConnection] = useState<CoreConnectionState>('offline');
  const [lastCommand, setLastCommand] = useState<OfficeCommand>('IDLE_WORK');
  const [mode, setMode] = useState<'cloud' | 'preview'>(coreUrl ? 'cloud' : 'preview');

  useEffect(() => {
    if (!coreUrl) return;
    const bridge = new CloudflareIsabelCoreBridge(coreUrl, getSessionId());
    bridgeRef.current = bridge;
    const unsubscribe = bridge.subscribe(event => {
      if (event.state) setCoreState(event.state);
      setConnection(bridge.getStatus());
      setMode('cloud');
    });
    bridge.connect();
    const statusTimer = window.setInterval(() => setConnection(bridge.getStatus()), 1000);
    return () => {
      window.clearInterval(statusTimer);
      unsubscribe();
      bridge.disconnect();
      bridgeRef.current = null;
    };
  }, [coreUrl]);

  const sendCommand = (command: OfficeCommand) => {
    setLastCommand(command);
    if (!bridgeRef.current || bridgeRef.current.getStatus() === 'offline') {
      setCoreState(current => previewState(current, command));
      setMode('preview');
      return;
    }
    try {
      bridgeRef.current.sendOfficeCommand(command);
      setConnection(bridgeRef.current.getStatus());
    } catch {
      setConnection('degraded');
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#090c10', color: '#f4f6f8', padding: 20, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 1580, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, opacity: .62, letterSpacing: 1.6 }}>SSX • ISABEL • CLOUDFLARE-FIRST</div>
            <h1 style={{ margin: '5px 0 3px', fontSize: 29 }}>Isabel Live Office</h1>
            <div style={{ opacity: .66, fontSize: 13 }}>Browser-rendered office • persistent Cloudflare core • Unreal optional</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.6 }}>
            <div><strong>Core:</strong> {coreUrl ? connection.toUpperCase() : 'NOT DEPLOYED'}</div>
            <div><strong>Mode:</strong> {mode === 'cloud' ? 'CLOUDFLARE SESSION' : 'LOCAL PREVIEW'}</div>
            <div><strong>State:</strong> {coreState.sessionState.toUpperCase()} • rev {coreState.revision}</div>
          </div>
        </header>

        <BrowserOfficeStage state={coreState} />

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 13 }}>
          {COMMANDS.map(([label, command]) => (
            <button
              key={command}
              onClick={() => sendCommand(command)}
              style={{ padding: '9px 13px', border: '1px solid #363d47', background: lastCommand === command ? '#253142' : '#151a21', color: '#fff', cursor: 'pointer', fontWeight: 650 }}
            >
              {label}
            </button>
          ))}
          <a href="/live-office/operator" style={{ padding: '9px 13px', border: '1px solid #363d47', background: '#151a21', color: '#fff', textDecoration: 'none', fontWeight: 650 }}>Operator</a>
          <a href="/live-office/unreal" style={{ padding: '9px 13px', border: '1px solid #363d47', background: '#151a21', color: '#aeb7c4', textDecoration: 'none', fontWeight: 650 }}>Optional Unreal Renderer</a>
        </section>

        {!coreUrl ? (
          <div style={{ marginTop: 12, padding: '10px 12px', border: '1px solid #514522', background: '#1b180e', color: '#e4cf89', fontSize: 12, lineHeight: 1.5 }}>
            Cloudflare core code is now in the repository. This page is running its local browser preview until the Worker is deployed and NEXT_PUBLIC_ISABEL_CORE_URL points to it. Preview movement is visual-only and is not presented as persisted Cloudflare state.
          </div>
        ) : null}
      </div>
    </main>
  );
}
