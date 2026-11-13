import { flushServerSync } from './sync-flush';
import { SYNC_DELAY_MS, syncState } from './sync-state';
import { PENDING_KEY, markSynced, readPending, writeJson } from './sync-storage';

function schedule(): void {
  if (!syncState.enabled || syncState.timer !== null) return;
  syncState.timer = setTimeout(() => {
    syncState.timer = null;
    void flushServerSync();
  }, SYNC_DELAY_MS);
}

export function queueMeetingSync(sessionId: string): void {
  if (!sessionId) return;
  syncState.generation.set(sessionId, (syncState.generation.get(sessionId) ?? 0) + 1);
  const pending = readPending();
  if (!pending.save.includes(sessionId)) pending.save.push(sessionId);
  pending.remove = pending.remove.filter((id) => id !== sessionId);
  writeJson(PENDING_KEY, pending);
  schedule();
}

export function queueMeetingClear(sessionId: string): void {
  if (!sessionId) return;
  syncState.clearGeneration.set(sessionId, (syncState.clearGeneration.get(sessionId) ?? 0) + 1);
  markSynced(sessionId, null);
  queueMeetingSync(sessionId);
  void flushServerSync();
}

export function queueMeetingDelete(sessionId: string): void {
  if (!sessionId) return;
  const pending = readPending();
  pending.save = pending.save.filter((id) => id !== sessionId);
  if (!pending.remove.includes(sessionId)) pending.remove.push(sessionId);
  writeJson(PENDING_KEY, pending);
  schedule();
}
