import type { StoredMeeting } from '@/lib/meeting-db/types';
import { ensureMeetingLoaded, evictSynced } from './meeting-loader';
import { deleteSession, getSessionMetadata } from './session-store';
import { getTranscriptSessionId, isCaptureActive } from './transcript-session';
import { buildStoredMeeting } from './stored-meeting';
import { syncState } from './sync-state';
import { PENDING_KEY, markSynced, readPending, writeJson } from './sync-storage';

type SendOutcome = 'done' | 'deleted' | 'retry';

async function send(method: 'PUT' | 'DELETE', id: string, body?: StoredMeeting): Promise<SendOutcome> {
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return 'done';
    if (res.status === 410) return 'deleted';
    return res.status === 409 || res.status === 400 ? 'done' : 'retry';
  } catch {
    return 'retry';
  }
}

export function dropDeleted(id: string): void {
  const pending = readPending();
  writeJson(PENDING_KEY, { ...pending, save: pending.save.filter((x) => x !== id) });
  markSynced(id, null);
  if (isCaptureActive() && getTranscriptSessionId() === id) return;
  if (getSessionMetadata(id)) deleteSession(id, { deletedOnServer: true });
}

async function flushRemovals(ids: string[]): Promise<void> {
  for (const id of ids) {
    if ((await send('DELETE', id)) !== 'retry') {
      markSynced(id, null);
      const now = readPending();
      writeJson(PENDING_KEY, { ...now, remove: now.remove.filter((x) => x !== id) });
    }
  }
}

async function flushSaves(ids: string[]): Promise<void> {
  for (const id of ids) {
    const gen = syncState.generation.get(id) ?? 0;
    if (!(await ensureMeetingLoaded(id))) continue;
    const meeting = buildStoredMeeting(id);
    const sent = meeting ? await send('PUT', id, meeting) : 'done';
    if (sent === 'retry') continue;
    if (sent === 'deleted') {
      dropDeleted(id);
      continue;
    }
    if (meeting) markSynced(id, meeting.updatedAt);
    if ((syncState.generation.get(id) ?? 0) !== gen) continue;
    const now = readPending();
    writeJson(PENDING_KEY, { ...now, save: now.save.filter((x) => x !== id) });
  }
}

export function flushServerSync(): Promise<void> {
  if (!syncState.enabled) return Promise.resolve();
  if (syncState.flushing) return syncState.flushing.then(() => flushServerSync());
  syncState.flushing = (async () => {
    const pending = readPending();
    await flushRemovals(pending.remove);
    await flushSaves(pending.save);
    evictSynced();
  })().finally(() => {
    syncState.flushing = null;
  });
  return syncState.flushing;
}
