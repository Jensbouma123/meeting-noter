import type { StoredMeeting } from '@/lib/meeting-db/types';
import { loadAutosavedSession } from './autosave';
import { hasLocalNotes } from './notes-storage';
import {
  adoptStoredMeeting,
  cacheMeetingContent,
  evictMeetingContent,
  getSessionMetadata,
  listSessions,
} from './session-store';
import { loadSessionTranscript } from './session-transcript-storage';
import { syncState } from './sync-state';
import { SYNCED_KEY, markSynced, readJson, readPending } from './sync-storage';
import { getTranscriptSessionId } from './store';

function hasLocalTranscript(id: string): boolean {
  return loadSessionTranscript(id) !== null || loadAutosavedSession()?.sessionId === id;
}

export function isOpen(id: string): boolean {
  return getTranscriptSessionId() === id || loadAutosavedSession()?.sessionId === id;
}

export async function ensureMeetingLoaded(id: string): Promise<boolean> {
  const local = getSessionMetadata(id) !== null;
  const dropped = readJson<Record<string, number>>(SYNCED_KEY, {})[id] !== undefined;
  if (local && (!dropped || (hasLocalTranscript(id) && hasLocalNotes(id)))) return true;
  const gen = syncState.clearGeneration.get(id) ?? 0;
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.status === 404 || res.status === 410) return true;
    if (!res.ok) return false;
    const { meeting } = (await res.json()) as { meeting: StoredMeeting };
    if ((syncState.clearGeneration.get(id) ?? 0) !== gen) return true;
    if (local) cacheMeetingContent(meeting);
    else {
      adoptStoredMeeting(meeting);
      markSynced(id, meeting.updatedAt);
    }
    return true;
  } catch {
    return false;
  }
}

export function evictSynced(): void {
  const pending = readPending();
  const synced = readJson<Record<string, number>>(SYNCED_KEY, {});
  for (const s of listSessions()) {
    const at = synced[s.sessionId];
    if (at === undefined || at < s.updatedAt || pending.save.includes(s.sessionId) || isOpen(s.sessionId)) continue;
    evictMeetingContent(s.sessionId);
  }
}
