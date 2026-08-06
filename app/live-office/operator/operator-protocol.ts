export const OPERATOR_ACTIONS = [
  'REFRESH_STATUS',
  'RUN_HEALTH_REPORT',
  'RUN_RUNTIME_SMOKE',
  'RUN_ADVERSARIAL_BENCHMARK',
  'RUN_COMMISSIONING_DASHBOARD',
  'RUN_LIVE_REHEARSAL',
  'OPEN_LIVE_SESSION',
  'CLOSE_LIVE_SESSION',
] as const;

export type OperatorAction = (typeof OPERATOR_ACTIONS)[number];
export type GateStatus = 'WAITING' | 'PASS' | 'DEGRADED' | 'BLOCKED' | 'RUNNING';

export type OperatorCommand = {
  source: 'ssx-isabel-operator';
  version: 1;
  type: 'operator-command';
  action: OperatorAction;
  requestId: string;
  issuedAt: string;
};

export type CommissioningSubsystem = {
  id: string;
  label: string;
  status: GateStatus;
  detail?: string;
  updatedAt?: string;
};

export type OperatorStatusMessage = {
  source: 'ssx-isabel-runtime';
  version: 1;
  type: 'operator-status';
  overall: GateStatus;
  liveAllowed: boolean;
  sessionState?: string;
  activeStep?: string;
  message?: string;
  subsystems: CommissioningSubsystem[];
  updatedAt: string;
};

export function makeOperatorCommand(action: OperatorAction): OperatorCommand {
  return {
    source: 'ssx-isabel-operator',
    version: 1,
    type: 'operator-command',
    action,
    requestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    issuedAt: new Date().toISOString(),
  };
}

export function isOperatorStatusMessage(value: unknown): value is OperatorStatusMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OperatorStatusMessage>;
  return (
    candidate.source === 'ssx-isabel-runtime' &&
    candidate.version === 1 &&
    candidate.type === 'operator-status' &&
    typeof candidate.liveAllowed === 'boolean' &&
    Array.isArray(candidate.subsystems)
  );
}
