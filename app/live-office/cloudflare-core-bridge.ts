'use client';

import type { OfficeCommand } from './protocol';

export type CoreConnectionState = 'offline' | 'connecting' | 'ready' | 'degraded';

export type IsabelCoreState = {
  version: 1;
  revision: number;
  presence: string;
  sessionState: string;
  pose: string;
  anchor: string;
  gaze: string;
  activity: string;
  liveAllowed: boolean;
  activeProject: string | null;
  activeThread: string | null;
  updatedAt: string | null;
};

type CoreEnvelope = {
  source: 'ssx-isabel-core';
  version: 1;
  type: 'SESSION_READY' | 'STATE_SNAPSHOT' | 'STATE_PATCH' | 'ACK' | 'REJECT' | 'PONG' | 'ERROR';
  sessionId: string;
  issuedAt: string;
  requestId?: string;
  action?: string;
  error?: string;
  revision?: number;
  state?: IsabelCoreState;
};

type CoreListener = (event: CoreEnvelope) => void;

const ACTION_MAP: Record<OfficeCommand, string> = {
  CAMERA_ARRIVAL: 'PRESENCE_ONLINE',
  LOOK_AT_USER: 'LOOK_AT_USER',
  GO_TO_DESK: 'GO_TO_DESK',
  GO_TO_SCREEN_01: 'GO_TO_SCREEN_01',
  GO_TO_SCREEN_02: 'GO_TO_SCREEN_02',
  GO_TO_SCREEN_03: 'GO_TO_SCREEN_03',
  GO_TO_SCREEN_04: 'GO_TO_SCREEN_04',
  SIT_AT_DESK: 'SIT_AT_DESK',
  STAND_FROM_DESK: 'STAND_FROM_DESK',
  IDLE_WORK: 'IDLE_WORK',
};

function makeRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function toWebSocketUrl(coreUrl: string, sessionId: string) {
  const url = new URL(coreUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/api/session/${encodeURIComponent(sessionId)}/ws`;
  url.search = '';
  return url.toString();
}

export class CloudflareIsabelCoreBridge {
  private socket: WebSocket | null = null;
  private listeners = new Set<CoreListener>();
  private state: CoreConnectionState = 'offline';
  private heartbeatTimer: number | null = null;
  private lastPongAt = 0;

  constructor(
    private readonly coreUrl: string,
    private readonly sessionId: string,
  ) {}

  subscribe(listener: CoreListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus() {
    return this.state;
  }

  connect() {
    if (!this.coreUrl || this.socket) return;
    this.state = 'connecting';
    const socket = new WebSocket(toWebSocketUrl(this.coreUrl, this.sessionId));
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.state = 'ready';
      this.lastPongAt = Date.now();
      this.startHeartbeat();
      socket.send(JSON.stringify({
        source: 'ssx-isabel-browser',
        version: 1,
        type: 'STATE_REQUEST',
        requestId: makeRequestId(),
        issuedAt: new Date().toISOString(),
      }));
    });

    socket.addEventListener('message', event => {
      try {
        const parsed = JSON.parse(String(event.data)) as CoreEnvelope;
        if (parsed.source !== 'ssx-isabel-core' || parsed.version !== 1) return;
        if (parsed.type === 'PONG') this.lastPongAt = Date.now();
        if (parsed.type === 'SESSION_READY' || parsed.type === 'STATE_SNAPSHOT' || parsed.type === 'STATE_PATCH') {
          this.state = 'ready';
        }
        for (const listener of this.listeners) listener(parsed);
      } catch {
        this.state = 'degraded';
      }
    });

    socket.addEventListener('close', () => {
      this.stopHeartbeat();
      this.socket = null;
      this.state = 'offline';
    });

    socket.addEventListener('error', () => {
      this.state = 'degraded';
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.state = 'offline';
  }

  sendOfficeCommand(command: OfficeCommand) {
    const action = ACTION_MAP[command];
    return this.sendAction(action);
  }

  sendAction(action: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Isabel Cloudflare core is not connected');
    }
    const requestId = makeRequestId();
    this.socket.send(JSON.stringify({
      source: 'ssx-isabel-browser',
      version: 1,
      type: 'COMMAND',
      action,
      requestId,
      issuedAt: new Date().toISOString(),
    }));
    return requestId;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const age = Date.now() - this.lastPongAt;
      if (age > 15000) this.state = 'degraded';
      this.socket.send(JSON.stringify({
        source: 'ssx-isabel-browser',
        version: 1,
        type: 'PING',
        requestId: makeRequestId(),
        issuedAt: new Date().toISOString(),
      }));
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}
