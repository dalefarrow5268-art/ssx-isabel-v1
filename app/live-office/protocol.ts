export const OFFICE_COMMANDS = [
  'CAMERA_ARRIVAL',
  'LOOK_AT_USER',
  'GO_TO_DESK',
  'GO_TO_SCREEN_01',
  'GO_TO_SCREEN_02',
  'GO_TO_SCREEN_03',
  'GO_TO_SCREEN_04',
  'SIT_AT_DESK',
  'STAND_FROM_DESK',
  'IDLE_WORK',
] as const;

export type OfficeCommand = (typeof OFFICE_COMMANDS)[number];

export type IsabelOfficeMessage = {
  source: 'ssx-isabel-web';
  version: 1;
  type: 'office-command';
  command: OfficeCommand;
  issuedAt: string;
  requestId: string;
};

export function makeOfficeMessage(command: OfficeCommand): IsabelOfficeMessage {
  return {
    source: 'ssx-isabel-web',
    version: 1,
    type: 'office-command',
    command,
    issuedAt: new Date().toISOString(),
    requestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  };
}
