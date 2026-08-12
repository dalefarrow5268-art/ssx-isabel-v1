const ALLOWED_ACTIONS = new Set([
  'PRESENCE_ONLINE',
  'PRESENCE_AWAY',
  'LOOK_AT_USER',
  'IDLE_WORK',
  'GO_TO_DESK',
  'SIT_AT_DESK',
  'STAND_FROM_DESK',
  'GO_TO_SCREEN_01',
  'GO_TO_SCREEN_02',
  'GO_TO_SCREEN_03',
  'GO_TO_SCREEN_04',
  'OPEN_LIVE_SESSION',
  'CLOSE_LIVE_SESSION',
]);

const INITIAL_STATE = {
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

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get('origin') || '';
  const allowed = env.ALLOWED_ORIGIN || '';
  const origin = !allowed || requestOrigin === allowed ? requestOrigin || '*' : allowed;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function parseSessionRoute(url) {
  const match = url.pathname.match(/^\/api\/session\/([^/]+)(?:\/(ws|state|event))?$/);
  if (!match) return null;
  return { sessionId: decodeURIComponent(match[1]), action: match[2] || 'state' };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'ssx-isabel-core',
        version: env.CORE_VERSION || 'dev',
        architecture: 'cloudflare-first',
        renderer: 'browser',
      }, 200, cors);
    }

    const route = parseSessionRoute(url);
    if (!route) return json({ error: 'not_found' }, 404, cors);

    const id = env.ISABEL_SESSION.idFromName(route.sessionId);
    const stub = env.ISABEL_SESSION.get(id);
    const target = new URL(request.url);
    target.pathname = `/${route.action}`;
    target.searchParams.set('sessionId', route.sessionId);

    const forwarded = new Request(target.toString(), request);
    const response = await stub.fetch(forwarded);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export class IsabelSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessionId = null;
    this.current = null;
  }

  async ensureState() {
    if (this.current) return this.current;
    const stored = await this.state.storage.get('canonical');
    this.current = stored || { ...INITIAL_STATE, updatedAt: new Date().toISOString() };
    if (!stored) await this.state.storage.put('canonical', this.current);
    return this.current;
  }

  async fetch(request) {
    const url = new URL(request.url);
    this.sessionId = url.searchParams.get('sessionId') || this.sessionId || 'default';

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket_required' }, 426);
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.state.acceptWebSocket(server);
      const current = await this.ensureState();
      server.send(JSON.stringify(this.envelope('SESSION_READY', { state: current })));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/state' && request.method === 'GET') {
      return json({ ok: true, sessionId: this.sessionId, state: await this.ensureState() });
    }

    if (url.pathname === '/event' && request.method === 'POST') {
      const payload = await request.json();
      const result = await this.applyEvent(payload);
      return json(result, result.ok ? 200 : 400);
    }

    return json({ error: 'not_found' }, 404);
  }

  envelope(type, payload = {}) {
    return {
      source: 'ssx-isabel-core',
      version: 1,
      type,
      sessionId: this.sessionId || 'default',
      issuedAt: new Date().toISOString(),
      ...payload,
    };
  }

  async webSocketMessage(ws, message) {
    let payload;
    try {
      payload = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      ws.send(JSON.stringify(this.envelope('ERROR', { error: 'invalid_json' })));
      return;
    }

    if (payload.type === 'PING') {
      ws.send(JSON.stringify(this.envelope('PONG')));
      return;
    }

    if (payload.type === 'STATE_REQUEST') {
      ws.send(JSON.stringify(this.envelope('STATE_SNAPSHOT', { state: await this.ensureState() })));
      return;
    }

    if (payload.type !== 'COMMAND') {
      ws.send(JSON.stringify(this.envelope('ERROR', { requestId: payload.requestId, error: 'unsupported_message_type' })));
      return;
    }

    const result = await this.applyEvent(payload);
    ws.send(JSON.stringify(this.envelope(result.ok ? 'ACK' : 'REJECT', {
      requestId: payload.requestId,
      action: payload.action,
      error: result.error,
      revision: result.state?.revision,
    })));
  }

  async applyEvent(payload) {
    const action = String(payload?.action || '');
    if (!ALLOWED_ACTIONS.has(action)) return { ok: false, error: 'action_not_allowed' };

    const current = await this.ensureState();
    const next = { ...current };

    switch (action) {
      case 'PRESENCE_ONLINE': next.presence = 'online'; break;
      case 'PRESENCE_AWAY': next.presence = 'away'; break;
      case 'LOOK_AT_USER': next.gaze = 'user'; next.activity = action; break;
      case 'IDLE_WORK': next.activity = action; next.gaze = 'work'; break;
      case 'GO_TO_DESK': next.anchor = 'ISABEL_DESK_STAND'; next.pose = 'standing'; next.activity = action; break;
      case 'SIT_AT_DESK': next.anchor = 'ISABEL_DESK_SEATED'; next.pose = 'seated'; next.activity = action; break;
      case 'STAND_FROM_DESK': next.anchor = 'ISABEL_DESK_STAND'; next.pose = 'standing'; next.activity = action; break;
      case 'GO_TO_SCREEN_01': next.anchor = 'SCREEN_01_VIEW'; next.pose = 'standing'; next.activity = action; break;
      case 'GO_TO_SCREEN_02': next.anchor = 'SCREEN_02_VIEW'; next.pose = 'standing'; next.activity = action; break;
      case 'GO_TO_SCREEN_03': next.anchor = 'SCREEN_03_VIEW'; next.pose = 'standing'; next.activity = action; break;
      case 'GO_TO_SCREEN_04': next.anchor = 'SCREEN_04_VIEW'; next.pose = 'standing'; next.activity = action; break;
      case 'OPEN_LIVE_SESSION':
        if (!current.liveAllowed) return { ok: false, error: 'live_gate_closed', state: current };
        next.sessionState = 'live';
        break;
      case 'CLOSE_LIVE_SESSION': next.sessionState = 'idle'; break;
    }

    next.revision = Number(current.revision || 0) + 1;
    next.updatedAt = new Date().toISOString();
    this.current = next;
    await this.state.storage.put('canonical', next);
    await this.appendAudit(action, payload, next);
    this.broadcast(this.envelope('STATE_PATCH', { state: next, action, requestId: payload?.requestId }));
    return { ok: true, state: next };
  }

  async appendAudit(action, payload, next) {
    const key = `audit:${String(next.revision).padStart(12, '0')}`;
    await this.state.storage.put(key, {
      revision: next.revision,
      action,
      requestId: payload?.requestId || null,
      source: payload?.source || 'unknown',
      issuedAt: payload?.issuedAt || null,
      recordedAt: next.updatedAt,
    });
  }

  broadcast(message) {
    const serialized = JSON.stringify(message);
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(serialized); } catch { /* stale socket is ignored */ }
    }
  }

  async webSocketClose() {}
  async webSocketError() {}
}
