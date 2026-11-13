import { queueMeetingSync } from './sync-queue';

export const LIVE_SYNC_INTERVAL_MS = 10_000;

const lastQueued = new Map<string, number>();

export function queueLiveSync(sessionId: string, now = Date.now()): void {
  const last = lastQueued.get(sessionId) ?? 0;
  if (now - last < LIVE_SYNC_INTERVAL_MS) return;
  lastQueued.set(sessionId, now);
  queueMeetingSync(sessionId);
}

export function resetLiveSync(): void {
  lastQueued.clear();
}
