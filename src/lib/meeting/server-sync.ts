import type { MeetingSummaryRow, StoredMeeting } from '@/lib/meeting-db/types';
import { getNotes, hasLocalNotes } from './notes';
import { getStoredParticipants } from './participants';
import { loadAutosavedSession } from './autosave';
import { loadSessionTranscript } from './session-transcript-storage';
import {
  adoptMeetingSummary,
  adoptStoredMeeting,
  archiveAutosavedSession,
  cacheMeetingContent,
  deleteSession,
  evictMeetingContent,
  getSessionMetadata,
  listSessions,
} from './session-store';
import { getTranscriptSessionId, isCaptureActive } from './store';

/**
 * Keeps the server's meetings DB (`/api/meetings`, see `src/lib/meeting-db`)
 * in step with this browser. The DB is the archive. The session store still
 * works on localStorage synchronously; every change it makes is queued here
 * and written to the server a second later. When the server cannot be reached
 * the ids wait in `mn.sync.pending.v1` and go out on the next change, the next
 * start or when the browser is back online. Once the server confirms a
 * meeting, its transcript and notes leave localStorage unless it is the open
 * meeting (`evictSynced`); `ensureMeetingLoaded` fetches them again. Meetings
 * deleted in the DB stay deleted (`dropDeleted`).
 *
 * `startServerSync` (called once by the app shell) also:
 * - moves the browser's existing meetings and autosave into the DB once
 *   (`migrateBrowserMeetings`), telling the UI through `mn:meetings-migrated`;
 * - pulls meetings the DB has and this browser lacks, or has older, so a
 *   browser with cleared site data gets every saved meeting back, and sends
 *   any meeting the DB lacks. It pulls again whenever the browser is back online.
 * Nothing is sent before it runs, so unit tests never touch the network.
 */

const PENDING_KEY = 'mn.sync.pending.v1';
/** id -> the `updatedAt` the server last accepted from or sent to us. */
const SYNCED_KEY = 'mn.sync.synced.v1';
export const MIGRATED_KEY = 'mn.db-migrated.v1';
export const MIGRATED_EVENT = 'mn:meetings-migrated';
const SYNC_DELAY_MS = 1000;
const RETRY_MS = 30_000;
/** The most `/api/meetings` returns at once. */
const LIST_PAGE = 1000;

export interface MigrationResult {
  imported: number;
  skipped: number;
  invalid: number;
  dataDir: string;
}

interface Pending {
  save: string[];
  remove: string[];
}

let enabled = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let onOnline: (() => void) | null = null;
let flushing: Promise<void> | null = null;
/** Bumped by every queued change, so a flush knows whether the id changed while it was in flight. */
const generation = new Map<string, number>();
/** Bumped by every clear, so an in-flight refetch of the old copy can be dropped. */
const clearGeneration = new Map<string, number>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota: the change still reaches the server on the next successful flush of that id.
  }
}

function readPending(): Pending {
  const p = readJson<Partial<Pending>>(PENDING_KEY, {});
  return {
    save: Array.isArray(p.save) ? p.save.filter((x) => typeof x === 'string') : [],
    remove: Array.isArray(p.remove) ? p.remove.filter((x) => typeof x === 'string') : [],
  };
}

function markSynced(id: string, updatedAt: number | null): void {
  const synced = readJson<Record<string, number>>(SYNCED_KEY, {});
  if (updatedAt === null) delete synced[id];
  else synced[id] = updatedAt;
  writeJson(SYNCED_KEY, synced);
}

function schedule(): void {
  if (!enabled || timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    void flushServerSync();
  }, SYNC_DELAY_MS);
}

/** Queue a session's current local state for the server. Called by every session-store and notes write. */
export function queueMeetingSync(sessionId: string): void {
  if (!sessionId) return;
  generation.set(sessionId, (generation.get(sessionId) ?? 0) + 1);
  const pending = readPending();
  if (!pending.save.includes(sessionId)) pending.save.push(sessionId);
  pending.remove = pending.remove.filter((id) => id !== sessionId);
  writeJson(PENDING_KEY, pending);
  schedule();
}

/**
 * Queue a cleared transcript. Forgets the "server confirmed" mark first: with
 * the local transcript gone, `ensureMeetingLoaded` would read the meeting as
 * evicted and refetch the server's old copy, resurrecting the cleared text.
 * Flushes at once so the DB holds the empty meeting before any reload.
 */
export function queueMeetingClear(sessionId: string): void {
  if (!sessionId) return;
  clearGeneration.set(sessionId, (clearGeneration.get(sessionId) ?? 0) + 1);
  markSynced(sessionId, null);
  queueMeetingSync(sessionId);
  void flushServerSync();
}

/** Queue a session's removal from the server. */
export function queueMeetingDelete(sessionId: string): void {
  if (!sessionId) return;
  const pending = readPending();
  pending.save = pending.save.filter((id) => id !== sessionId);
  if (!pending.remove.includes(sessionId)) pending.remove.push(sessionId);
  writeJson(PENDING_KEY, pending);
  schedule();
}

/**
 * A session as the DB stores it, built from localStorage: the index entry,
 * the session's own transcript (or the autosave slot when it is the newer
 * copy of this session), its notes and its participants. Null for an unknown session.
 */
export function buildStoredMeeting(sessionId: string, now = Date.now()): StoredMeeting | null {
  const meta = getSessionMetadata(sessionId);
  if (!meta) return null;
  let transcript = loadSessionTranscript(sessionId);
  const autosaved = loadAutosavedSession();
  if (autosaved && autosaved.sessionId === sessionId && (!transcript || autosaved.savedAt > transcript.savedAt)) {
    transcript = autosaved;
  }
  const segments = (transcript?.segments ?? []).map(({ id, source, speaker, text, start, end, overlap, lowConfSpans }) => ({
    id, source, speaker, text, start, end, ...(overlap ? { overlap } : {}),
    ...(lowConfSpans?.length ? { lowConfSpans } : {}),
  }));
  return {
    id: sessionId,
    title: meta.title,
    createdAt: meta.createdAt,
    // The send time, not the index's: notes change without touching the index.
    updatedAt: Math.max(now, meta.updatedAt),
    startedAt: transcript?.startedAt ?? null,
    durationSeconds: meta.durationSeconds,
    captureMode: meta.captureMode ?? null,
    isDraft: segments.length === 0,
    segments,
    speakers: transcript?.speakers ?? {},
    notes: getNotes(sessionId),
    participants: getStoredParticipants(sessionId),
  };
}

/** `'done'`: the server took it or never will; `'deleted'`: the DB deleted this meeting; `'retry'`: try later. */
async function send(method: 'PUT' | 'DELETE', id: string, body?: StoredMeeting): Promise<'done' | 'deleted' | 'retry'> {
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return 'done';
    if (res.status === 410) return 'deleted';
    // 409: the server holds a newer copy, which the next pull brings in; 400:
    // the server will never take it. Either way retrying cannot help.
    return res.status === 409 || res.status === 400 ? 'done' : 'retry';
  } catch {
    return 'retry';
  }
}

/** Drop this browser's copy of a meeting the DB deleted; the one being recorded stays. */
function dropDeleted(id: string): void {
  const pending = readPending();
  writeJson(PENDING_KEY, { ...pending, save: pending.save.filter((x) => x !== id) });
  markSynced(id, null);
  if (isCaptureActive() && getTranscriptSessionId() === id) return;
  if (getSessionMetadata(id)) deleteSession(id, { deletedOnServer: true });
}

/** Send every queued change now. Ids that fail stay queued. */
export function flushServerSync(): Promise<void> {
  if (!enabled) return Promise.resolve();
  if (flushing) return flushing.then(() => flushServerSync());
  flushing = (async () => {
    const pending = readPending();
    for (const id of pending.remove) {
      if ((await send('DELETE', id)) !== 'retry') {
        markSynced(id, null);
        const now = readPending();
        writeJson(PENDING_KEY, { ...now, remove: now.remove.filter((x) => x !== id) });
      }
    }
    for (const id of pending.save) {
      const gen = generation.get(id) ?? 0;
      // An edit to a meeting whose transcript lives only in the DB: fetch it
      // first, so the copy sent back is whole. Offline it waits in the queue.
      if (!(await ensureMeetingLoaded(id))) continue;
      const meeting = buildStoredMeeting(id);
      const sent = meeting ? await send('PUT', id, meeting) : 'done';
      if (sent === 'retry') continue;
      if (sent === 'deleted') {
        dropDeleted(id);
        continue;
      }
      if (meeting) markSynced(id, meeting.updatedAt);
      // A change queued while this one was in flight keeps the id queued.
      if ((generation.get(id) ?? 0) !== gen) continue;
      const now = readPending();
      writeJson(PENDING_KEY, { ...now, save: now.save.filter((x) => x !== id) });
    }
    evictSynced();
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** True when this browser holds the session's transcript (its own copy or the autosave). */
function hasLocalTranscript(id: string): boolean {
  return loadSessionTranscript(id) !== null || loadAutosavedSession()?.sessionId === id;
}

/** The meeting on screen or being recorded: its copy stays in localStorage. */
function isOpen(id: string): boolean {
  return getTranscriptSessionId() === id || loadAutosavedSession()?.sessionId === id;
}

/**
 * Make sure this browser holds a meeting's transcript and notes, fetching
 * them from the DB when it dropped them (`evictSynced`) or never had them.
 * Fills in only what is missing, so unsent local edits survive. False when
 * the DB could not be reached; true when there is nothing more to get.
 */
export async function ensureMeetingLoaded(id: string): Promise<boolean> {
  const local = getSessionMetadata(id) !== null;
  // Only a meeting the server confirmed can have been dropped here.
  const dropped = readJson<Record<string, number>>(SYNCED_KEY, {})[id] !== undefined;
  if (local && (!dropped || (hasLocalTranscript(id) && hasLocalNotes(id)))) return true;
  const gen = clearGeneration.get(id) ?? 0;
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.status === 404 || res.status === 410) return true;
    if (!res.ok) return false;
    const { meeting } = (await res.json()) as { meeting: StoredMeeting };
    // Cleared while the fetch was in flight: the old copy must not come back.
    if ((clearGeneration.get(id) ?? 0) !== gen) return true;
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

/**
 * localStorage keeps only what the DB lacks and the open meeting: the
 * transcript and notes of every other meeting the server confirmed are
 * dropped (the index entry stays, for the list). `ensureMeetingLoaded`
 * brings them back when the meeting is opened.
 */
export function evictSynced(): void {
  const pending = readPending();
  const synced = readJson<Record<string, number>>(SYNCED_KEY, {});
  for (const s of listSessions()) {
    const at = synced[s.sessionId];
    if (at === undefined || at < s.updatedAt || pending.save.includes(s.sessionId) || isOpen(s.sessionId)) continue;
    evictMeetingContent(s.sessionId);
  }
}

/**
 * One-time move of this browser's meetings (and an autosave not yet filed
 * under its session) into the DB. Idempotent on both sides: the flag stops a
 * second run here, and the server skips meetings it already has. Returns the
 * counts, or null when it already ran or the server is unreachable (it then
 * runs again on the next start).
 */
export async function migrateBrowserMeetings(): Promise<MigrationResult | null> {
  if (readJson<unknown>(MIGRATED_KEY, null)) return null;
  // An autosave no session owns yet (a crash before it was filed) gets its
  // entry; one that has an entry is read by buildStoredMeeting as it is, so a
  // second run sends the same `updatedAt`. Never while recording.
  const autosaved = loadAutosavedSession();
  if (autosaved && !isCaptureActive() && !getSessionMetadata(autosaved.sessionId)) archiveAutosavedSession();
  // Each keeps its index time as `updatedAt`, so importing it twice is a no-op.
  const meetings = listSessions()
    .map((s) => buildStoredMeeting(s.sessionId, s.updatedAt))
    .filter((m): m is StoredMeeting => m !== null);
  let result: MigrationResult;
  let firstImport = true;
  try {
    const res = await fetch('/api/meetings/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ meetings }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as MigrationResult & { ok: boolean; firstImport?: boolean };
    firstImport = body.firstImport !== false;
    result = { imported: body.imported, skipped: body.skipped, invalid: body.invalid, dataDir: body.dataDir };
  } catch {
    return null;
  }
  for (const m of meetings) markSynced(m.id, m.updatedAt);
  writeJson(MIGRATED_KEY, { at: Date.now(), ...result });
  // The DB remembers its first import, so a cleared browser is not told again.
  if (firstImport && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent<MigrationResult>(MIGRATED_EVENT, { detail: result }));
  }
  return result;
}

/**
 * Bring in meetings the DB has that this browser lacks or holds an older copy
 * of (another browser, cleared site data). Local changes still queued, and the
 * session being recorded, are never overwritten. Returns how many it adopted.
 */
export async function pullFromServer(): Promise<number> {
  const list: MeetingSummaryRow[] = [];
  let deleted: string[] = [];
  try {
    for (;;) {
      const res = await fetch(`/api/meetings?limit=${LIST_PAGE}&offset=${list.length}`, { cache: 'no-store' });
      if (!res.ok) return 0;
      const body = (await res.json()) as { meetings: MeetingSummaryRow[]; deleted?: string[] };
      list.push(...body.meetings);
      deleted = body.deleted ?? [];
      if (body.meetings.length < LIST_PAGE) break;
    }
  } catch {
    return 0;
  }
  // Deleted in the DB (from another browser): gone here too, never sent back.
  const gone = new Set(deleted);
  for (const id of gone) dropDeleted(id);
  // A meeting only this browser has (its queue entry lost to a full or
  // edited localStorage, or the DB restored from an older copy) goes up now,
  // so the DB never misses a meeting the browser still shows.
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
    // Only the list entry comes over; the transcript and notes are fetched
    // when the meeting is opened. An older local copy is dropped, except of
    // the open meeting, which is replaced whole.
    if (isOpen(row.id)) {
      try {
        const res = await fetch(`/api/meetings/${encodeURIComponent(row.id)}`, { cache: 'no-store' });
        if (!res.ok) continue;
        adoptStoredMeeting(((await res.json()) as { meeting: StoredMeeting }).meeting);
      } catch {
        continue; // Next pull tries again.
      }
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

/**
 * Ids of the meetings whose title, notes or transcript match `query` in the
 * DB, for the sidebar search over transcripts this browser dropped. Null
 * before `startServerSync` or when the server cannot be reached.
 */
export async function searchMeetingIds(query: string): Promise<Set<string> | null> {
  if (!enabled || !query.trim()) return null;
  try {
    const res = await fetch(`/api/meetings?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return new Set(((await res.json()) as { meetings: { id: string }[] }).meetings.map((m) => m.id));
  } catch {
    return null;
  }
}

/** Turn syncing on: migrate once, push what is queued, pull what is missing, and retry while offline. */
export async function startServerSync(): Promise<void> {
  if (enabled) return;
  enabled = true;
  if (typeof window !== 'undefined') {
    // Back online: send what waited, then take what the DB gained meanwhile.
    onOnline = () => void flushServerSync().then(pullFromServer);
    window.addEventListener('online', onOnline);
    retryTimer = setInterval(() => {
      const p = readPending();
      if (p.save.length > 0 || p.remove.length > 0) void flushServerSync();
    }, RETRY_MS);
  }
  await migrateBrowserMeetings();
  await flushServerSync();
  await pullFromServer();
}

/**
 * Delete every meeting in the server's DB, also those this browser never
 * loaded, and forget what is queued for them. True when the server did it;
 * on false the per-meeting deletes already queued by `deleteSession` retry.
 */
export async function deleteAllOnServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/meetings', { method: 'DELETE' });
    if (res.ok) writeJson(PENDING_KEY, { save: [], remove: [] });
    return res.ok;
  } catch {
    return false;
  }
}

/** Tests: back to the state before `startServerSync`. */
export function stopServerSyncForTests(): void {
  enabled = false;
  if (timer !== null) clearTimeout(timer);
  if (retryTimer !== null) clearInterval(retryTimer);
  if (onOnline) window.removeEventListener('online', onOnline);
  onOnline = null;
  timer = null;
  retryTimer = null;
  flushing = null;
  generation.clear();
}
