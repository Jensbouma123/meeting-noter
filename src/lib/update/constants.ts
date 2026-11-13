import type { UpdateStatus } from './types';

export const INSTALL_URL = 'https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh';

export const MAX_NOTES = 20_000;

export const IDLE_STATUS: UpdateStatus = {
  state: 'idle',
  phase: null,
  percent: null,
  code: '',
  detail: null,
  fromVersion: null,
  toVersion: null,
  startedAt: null,
  finishedAt: null,
  restartRequired: false,
  logTail: '',
};
