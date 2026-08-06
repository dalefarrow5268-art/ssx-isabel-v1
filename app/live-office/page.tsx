'use client';

import { useMemo, useRef, useState } from 'react';
import { makeOfficeMessage, type OfficeCommand } from './protocol';

export default function LiveOfficePage() {
  const [lastCommand, setLastCommand] = useState<OfficeCommand>('CAMERA_ARRIVAL');
  const [bridgeState, setBridgeState] = useState<'waiting' | 'ready'>('waiting');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const streamUrl = useMemo(() => process.env.NEXT_PUBLIC_ISABEL_STREAM_URL || '', []);

  const sendCommand = (command: OfficeCommand) => {
    const message = makeOfficeMessage(command);
    setLastCommand(command);

    // Local event keeps the web shell testable before the Unreal machine is online.
    window.dispatchEvent(new CustomEvent('isabel-office-command', { detail: message }));

    // Pixel Streaming frontend can receive this envelope and forward it over its
    // WebRTC data channel. Saturday we attach the frontend-side adapter to Unreal.
    iframeRef.current?.contentWindow?.postMessage(message, '*');
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0c10', color: '#f4f5f7', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.7, letterSpacing: 1.4 }}>SSX • ISABEL</div>
            <h1 style={{ margin: '5px 0 0', fontSize: 28 }}>Live Office Bridge</h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.8 }}>
            <div>Bridge: {bridgeState}</div>
            <div>Last command: {lastCommand}</div>
          </div>
        </header>

        <section style={{ position: 'relative', aspectRatio: '16 / 9', border: '1px solid #30343b', background: '#11151b', overflow: 'hidden' }}>
          {streamUrl ? (
            <iframe
              ref={iframeRef}
              title="Isabel Live Office"
              src={streamUrl}
              allow="autoplay; microphone; camera; fullscreen"
              onLoad={() => setBridgeState('ready')}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: 10 }}>Live office shell is ready</div>
                <div style={{ maxWidth: 700, opacity: 0.72, lineHeight: 1.55 }}>
                  The browser command bridge and Unreal project are prepared. Saturday the home AI computer supplies the live Pixel Streaming endpoint and this panel becomes the real-time office viewport.
                </div>
              </div>
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {([
            ['Arrival Camera', 'CAMERA_ARRIVAL'],
            ['Look at User', 'LOOK_AT_USER'],
            ['Work at Desk', 'IDLE_WORK'],
            ['Sit', 'SIT_AT_DESK'],
            ['Stand', 'STAND_FROM_DESK'],
            ['Desk', 'GO_TO_DESK'],
            ['Screen 1', 'GO_TO_SCREEN_01'],
            ['Screen 2', 'GO_TO_SCREEN_02'],
            ['Screen 3', 'GO_TO_SCREEN_03'],
            ['Screen 4', 'GO_TO_SCREEN_04'],
          ] as const).map(([label, command]) => (
            <button
              key={command}
              onClick={() => sendCommand(command)}
              style={{ padding: '10px 14px', border: '1px solid #3d434c', background: '#171b22', color: '#fff', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
