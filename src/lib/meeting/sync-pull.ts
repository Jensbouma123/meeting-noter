import type { MeetingSummaryRow, StoredMeeting } from '@/lib/meeting-db/types';
import { evictSynced, isOpen } from './meeting-loader';
import { adoptMeetingSummary, adoptStoredMeeting, evictMeetingContent } from './session-server-adopt';
import { getSessionMetadata } from './session-open';
import { listSessions } from './session-crud';
import { getTranscriptSessionId, isCaptureActive } from './transcript-session';
import { dropDeleted } from './sync-flush';
import { queueMeetingSync } from './sync-queue';
import { LIST_PAGE } from './sync-state';
import { SYNCED_KEY, markSynced, readJson, readPending } from './sync-storage';

async function fetchServerList(): Promise<{ list: MeetingSummaryRow[]; deleted: string[] } | null> {
  const list: MeetingSummaryRow[] = [];
  let deleted: string[] = [];
  try {
    for (;;) {
      const res = await fetch(`/api/meetings?limit=${LIST_PAGE}&offset=${list.length}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { meetings: MeetingSummaryRow[]; deleted?: string[] };
      list.push(...body.meetings);
      deleted = body.deleted ?? [];
      if (body.meetings.length < LIST_PAGE) break;
    }
  } catch {
    return null;
  }
  return { list, deleted };
}

async function adoptOpenMeeting(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return false;
    adoptStoredMeeting(((await res.json()) as { meeting: StoredMeeting }).meeting);
    return true;
  } catch {
    return false;
  }
}

export async function pullFromServer(): Promise<number> {
  const fetched = await fetchServerList();
  if (!fetched) return 0;
  const { list, deleted } = fetched;
  const gone = new Set(deleted);
  for (const id of gone) dropDeleted(id);
  const onServer = new Set(list.map((row) => row.id));
  for (const s of listSessions()) {
    if (!onServer.has(s.sessionId) && !gone.has(s.sessionId)) queueMeetingSync(s.sessionId);
  }
  const pending = readPending();
  const synced = readJson<Record<string, number>>(SYNCED_KEY, {});
  let adopted = 0;
  for (const row of list) {
    if (pending.save.includes(row.id) || pending.remove.includes(row.id)) continue;
    if (isCaptureActive() && getTranscriptSessionId() === row.id) continue;
    const local = getSessionMetadata(row.id);
    if (local && (synced[row.id] ?? local.updatedAt) >= row.updatedAt) continue;
    if (isOpen(row.id)) {
      if (!(await adoptOpenMeeting(row.id))) continue;
    } else {
      evictMeetingContent(row.id);
      adoptMeetingSummary(row);
    }
    markSynced(row.id, row.updatedAt);
    adopted += 1;
  }
  evictSynced();
  if (adopted > 0 && typeof window !== 'undefined') window.dispatchEvent(new Event('mn:sessions-changed'));
  return adopted;
}
