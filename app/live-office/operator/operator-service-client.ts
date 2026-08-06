'use client';

import type { OperatorAction } from './operator-protocol';

export type OperatorJobState = 'RUNNING' | 'PASS' | 'FAILED';

export type OperatorJob = {
  id: string;
  command: string;
  state: OperatorJobState;
  started_at: number;
  completed_at?: number | null;
  return_code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string | null;
};

export type OperatorServiceStatus = {
  service: 'isabel-operator-command-service';
  state: 'READY' | 'DEGRADED';
  startedAt: number;
  updatedAt: number;
  lastError?: string | null;
  jobs: OperatorJob[];
};

const LOCAL_SERVICE_ACTIONS = new Set<OperatorAction>([
  'RUN_HEALTH_REPORT',
  'RUN_RUNTIME_SMOKE',
  'RUN_ADVERSARIAL_BENCHMARK',
  'RUN_COMMISSIONING_DASHBOARD',
  'RUN_LIVE_REHEARSAL',
]);

export class OperatorServiceClient {
  readonly baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_ISABEL_OPERATOR_SERVICE_URL || 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  supports(action: OperatorAction): boolean {
    return LOCAL_SERVICE_ACTIONS.has(action);
  }

  async health(signal?: AbortSignal): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/health`, { cache: 'no-store', signal });
    if (!response.ok) return false;
    const payload = await response.json() as { ok?: boolean };
    return payload.ok === true;
  }

  async status(signal?: AbortSignal): Promise<OperatorServiceStatus> {
    const response = await fetch(`${this.baseUrl}/status`, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Operator service status failed: HTTP ${response.status}`);
    return response.json() as Promise<OperatorServiceStatus>;
  }

  async run(action: OperatorAction, signal?: AbortSignal): Promise<OperatorJob> {
    if (!this.supports(action)) throw new Error(`Action is not a local commissioning job: ${action}`);
    const response = await fetch(`${this.baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: action }),
      cache: 'no-store',
      signal,
    });
    const payload = await response.json() as { accepted?: boolean; job?: OperatorJob; error?: string };
    if (!response.ok || !payload.accepted || !payload.job) {
      throw new Error(payload.error || `Operator command failed: HTTP ${response.status}`);
    }
    return payload.job;
  }

  async job(jobId: string, signal?: AbortSignal): Promise<OperatorJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store', signal });
    const payload = await response.json() as OperatorJob & { error?: string };
    if (!response.ok) throw new Error(payload.error || `Operator job lookup failed: HTTP ${response.status}`);
    return payload;
  }

  async waitForJob(jobId: string, onUpdate?: (job: OperatorJob) => void, timeoutMs = 10 * 60 * 1000): Promise<OperatorJob> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const job = await this.job(jobId);
      onUpdate?.(job);
      if (job.state !== 'RUNNING') return job;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Operator job timed out in browser polling: ${jobId}`);
  }
}
