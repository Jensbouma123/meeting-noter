import type { StoredMeeting } from '@/lib/meeting-db/types';
import { loadAutosavedSession } from './autosave';
import { hasLocalNotes } from './notes-storage';
import { adoptStoredMeeting, cacheMeetingContent, evictMeetingContent } from './session-server-adopt';
import { getSessionMetadata } from './session-open';
import { listSessions } from './session-crud';
import { loadSessionTranscript } from './session-transcript-storage';
import { syncState } from './sync-state';
import { SYNCED_KEY, markSynced, readJson, readPending } from './sync-storage';
import { getTranscriptSessionId } from './transcript-session';

function hasLocalTranscript(id: string): boolean {
  return loadSessionTranscript(id) !== null || loadAutosavedSession()?.sessionId === id;
}

function openSessionIds(): Set<string> {
  const ids = new Set<string>();
  const live = getTranscriptSessionId();
  const saved = loadAutosavedSession()?.sessionId;
  if (live) ids.add(live);
  if (saved) ids.add(saved);
  return ids;
}

export function isOpen(id: string): boolean {
  return openSessionIds().has(id);
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
  const open = openSessionIds();
  for (const s of listSessions()) {
    const at = synced[s.sessionId];
    if (at === undefined || at < s.updatedAt || pending.save.includes(s.sessionId) || open.has(s.sessionId)) continue;
    evictMeetingContent(s.sessionId);
  }
}
