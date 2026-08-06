'use client';

import { useMemo, useState } from 'react';

type OfficeCommand =
  | 'LOOK_AT_USER'
  | 'GO_TO_DESK'
  | 'GO_TO_SCREEN_01'
  | 'GO_TO_SCREEN_02'
  | 'GO_TO_SCREEN_03'
  | 'GO_TO_SCREEN_04'
  | 'CAMERA_ARRIVAL';

export default function LiveOfficePage() {
  const [lastCommand, setLastCommand] = useState<OfficeCommand>('CAMERA_ARRIVAL');
  const streamUrl = useMemo(() => process.env.NEXT_PUBLIC_ISABEL_STREAM_URL || '', []);

  const sendCommand = (command: OfficeCommand) => {
    setLastCommand(command);
    // Proof-001 bridge: the browser contract is fixed now; the actual WebRTC/data-channel
    // sender is wired when the home AI PC Pixel Streaming endpoint is online.
    window.dispatchEvent(new CustomEvent('isabel-office-command', { detail: { command } }));
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0c10', color: '#f4f5f7', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.7, letterSpacing: 1.4 }}>SSX • ISABEL</div>
            <h1 style={{ margin: '5px 0 0', fontSize: 28 }}>Live Office Bridge</h1>
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Last command: {lastCommand}</div>
        </header>

        <section style={{ position: 'relative', aspectRatio: '16 / 9', border: '1px solid #30343b', background: '#11151b', overflow: 'hidden' }}>
          {streamUrl ? (
            <iframe
              title="Isabel Live Office"
              src={streamUrl}
              allow="autoplay; microphone; camera; fullscreen"
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: 10 }}>Waiting for the home AI computer</div>
                <div style={{ maxWidth: 700, opacity: 0.72, lineHeight: 1.55 }}>
                  This surface is reserved for the Unreal Pixel Streaming 2 feed. On Saturday we set
                  NEXT_PUBLIC_ISABEL_STREAM_URL to the secured stream endpoint after local/LAN testing passes.
                </div>
              </div>
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {([
            ['Arrival Camera', 'CAMERA_ARRIVAL'],
            ['Look at User', 'LOOK_AT_USER'],
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
