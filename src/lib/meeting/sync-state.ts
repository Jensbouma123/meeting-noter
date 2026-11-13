import type { SyncState } from './types/server-sync';

export const SYNC_DELAY_MS = 1000;
export const RETRY_MS = 30_000;
export const LIST_PAGE = 1000;

export const syncState: SyncState = {
  enabled: false,
  timer: null,
  retryTimer: null,
  onOnline: null,
  flushing: null,
  generation: new Map(),
  clearGeneration: new Map(),
};
