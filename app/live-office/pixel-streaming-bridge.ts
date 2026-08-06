'use client';

import type { IsabelOfficeMessage } from './protocol';

export type BridgeStatus = 'offline' | 'connecting' | 'ready' | 'degraded';

export type UnrealBridgeEnvelope = {
  source: 'ssx-live-office';
  version: 1;
  type: 'bridge-event';
  event: 'hello' | 'ready' | 'ack' | 'state' | 'error' | 'heartbeat';
  requestId?: string;
  issuedAt: string;
  payload?: Record<string, unknown>;
};

type Listener = (event: UnrealBridgeEnvelope) => void;

export class PixelStreamingBridge {
  private targetWindow: Window | null = null;
  private targetOrigin = '*';
  private listeners = new Set<Listener>();
  private pending = new Map<string, { sentAt: number; message: IsabelOfficeMessage }>();
  private heartbeatTimer: number | null = null;
  private status: BridgeStatus = 'offline';

  connect(targetWindow: Window, targetOrigin = '*') {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
    this.status = 'connecting';
    window.addEventListener('message', this.onMessage);
    this.sendBridgeEvent('hello');
    this.startHeartbeat();
  }

  disconnect() {
    window.removeEventListener('message', this.onMessage);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.targetWindow = null;
    this.pending.clear();
    this.status = 'offline';
  }

  getStatus() {
    return this.status;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  sendOfficeCommand(message: IsabelOfficeMessage) {
    if (!this.targetWindow) throw new Error('Pixel Streaming bridge is not connected');
    this.pending.set(message.requestId, { sentAt: performance.now(), message });
    this.targetWindow.postMessage(message, this.targetOrigin);
  }

  private sendBridgeEvent(event: UnrealBridgeEnvelope['event'], payload?: Record<string, unknown>) {
    if (!this.targetWindow) return;
    const envelope: UnrealBridgeEnvelope = {
      source: 'ssx-live-office',
      version: 1,
      type: 'bridge-event',
      event,
      issuedAt: new Date().toISOString(),
      payload,
    };
    this.targetWindow.postMessage(envelope, this.targetOrigin);
  }

  private startHeartbeat() {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      this.sendBridgeEvent('heartbeat', { pendingCommands: this.pending.size });
      const now = performance.now();
      for (const [requestId, item] of this.pending) {
        if (now - item.sentAt > 4000) {
          this.status = 'degraded';
          this.emit({
            source: 'ssx-live-office',
            version: 1,
            type: 'bridge-event',
            event: 'error',
            requestId,
            issuedAt: new Date().toISOString(),
            payload: { reason: 'command_ack_timeout', command: item.message.command },
          });
        }
      }
    }, 1500);
  }

  private onMessage = (event: MessageEvent) => {
    const data = event.data as Partial<UnrealBridgeEnvelope> | undefined;
    if (!data || data.source !== 'ssx-live-office' || data.version !== 1 || data.type !== 'bridge-event') return;

    const envelope = data as UnrealBridgeEnvelope;
    if (envelope.event === 'ready') this.status = 'ready';
    if (envelope.event === 'error') this.status = 'degraded';
    if (envelope.event === 'ack' && envelope.requestId) this.pending.delete(envelope.requestId);
    this.emit(envelope);
  };

  private emit(event: UnrealBridgeEnvelope) {
    for (const listener of this.listeners) listener(event);
  }
}
