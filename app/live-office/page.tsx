'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { makeOfficeMessage, type OfficeCommand } from './protocol';
import { PixelStreamingBridge, type BridgeStatus, type UnrealBridgeEnvelope } from './pixel-streaming-bridge';

export default function LiveOfficePage() {
  const [lastCommand, setLastCommand] = useState<OfficeCommand>('CAMERA_ARRIVAL');
  const [bridgeState, setBridgeState] = useState<BridgeStatus>('offline');
  const [lastBridgeEvent, setLastBridgeEvent] = useState<UnrealBridgeEnvelope['event']>('heartbeat');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<PixelStreamingBridge | null>(null);
  const streamUrl = useMemo(() => process.env.NEXT_PUBLIC_ISABEL_STREAM_URL || '', []);

  useEffect(() => {
    const bridge = new PixelStreamingBridge();
    bridgeRef.current = bridge;
    const unsubscribe = bridge.subscribe(event => {
      setLastBridgeEvent(event.event);
      setBridgeState(bridge.getStatus());
    });

    return () => {
      unsubscribe();
      bridge.disconnect();
      bridgeRef.current = null;
    };
  }, []);

  const connectIframeBridge = () => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;
    bridgeRef.current?.connect(targetWindow);
    setBridgeState(bridgeRef.current?.getStatus() ?? 'offline');
  };

  const sendCommand = (command: OfficeCommand) => {
    const message = makeOfficeMessage(command);
    setLastCommand(command);

    // Local event keeps the web shell testable before the Unreal machine is online.
    window.dispatchEvent(new CustomEvent('isabel-office-command', { detail: message }));

    try {
      bridgeRef.current?.sendOfficeCommand(message);
      setBridgeState(bridgeRef.current?.getStatus() ?? 'offline');
    } catch {
      // No renderer yet is a valid staging condition. The local event still fires.
      setBridgeState('offline');
    }
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
            <div>Last bridge event: {lastBridgeEvent}</div>
          </div>
        </header>

        <section style={{ position: 'relative', aspectRatio: '16 / 9', border: '1px solid #30343b', background: '#11151b', overflow: 'hidden' }}>
          {streamUrl ? (
            <iframe
              ref={iframeRef}
              title="Isabel Live Office"
              src={streamUrl}
              allow="autoplay; microphone; camera; fullscreen"
              onLoad={connectIframeBridge}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: 10 }}>ISABEL LIVE OFFICE — waiting for Unreal renderer</div>
                <div style={{ maxWidth: 700, opacity: 0.72, lineHeight: 1.55 }}>
                  Browser transport, command protocol, state synchronization, and Unreal bridge adapters are prepared. When the home GPU renderer comes online, this viewport becomes the persistent real-time office.
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
