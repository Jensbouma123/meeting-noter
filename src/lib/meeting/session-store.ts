import type { CaptureMode, Segment, Speaker } from './types';
import {
  loadAutosavedSession,
  clearAutosavedSession,
  saveSessionTranscript,
  loadSessionTranscript,
  removeSessionTranscript,
  removeSpeakerState,
  flushAutosave,
  type AutosavedSession,
} from './persist';
import {
  armAppend,
  bindTranscriptSession,
  clearIdleSession,
  getState,
  getTranscriptSessionId,
  isCaptureActive,
  loadIdleSession,
} from './store';
import { resetDiarization } from './diarization-bridge';
import { requestPersistentStorage } from './persistent-storage';
import { adoptNotes, hasLocalNotes, notesKey } from './notes';
import { queueMeetingDelete, queueMeetingSync } from './server-sync';
import type { MeetingSummaryRow, StoredMeeting } from '@/lib/meeting-db/types';

// ---------------------------------------------------------------------------
// Session index: persisted map of sessionId → session metadata.
// ---------------------------------------------------------------------------

const SESSIONS_KEY = 'mn.sessions.v1';
const INDEX_VERSION = 1;

interface SessionEntry {
  version: number;
  sessionId: string;
  title: string;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  /** When true, the session has no segments yet — it appears as a draft in the sidebar. */
  isDraft?: boolean;
  /** Capture source the session was recorded with; absent on older entries. */
  captureMode?: CaptureMode;
}

interface SessionIndex {
  version: number;
  sessions: SessionEntry[];
}

/** Read the session index; returns empty index when none/expired. Never throws. */
function readSessionIndex(): SessionIndex {
  if (typeof window === 'undefined') {
    return { version: INDEX_VERSION, sessions: [] };
  }
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return { version: INDEX_VERSION, sessions: [] };
    const parsed = JSON.parse(raw) as Partial<SessionIndex>;
    if (!parsed || parsed.version !== INDEX_VERSION) return { version: INDEX_VERSION, sessions: [] };
    if (!Array.isArray(parsed.sessions)) return { version: INDEX_VERSION, sessions: [] };
    return {
      version: INDEX_VERSION,
      sessions: parsed.sessions.filter(
        (s) =>
          s &&
          typeof s.sessionId === 'string' &&
          typeof s.title === 'string' &&
          typeof s.createdAt === 'number'
      ),
    };
  } catch {
    return { version: INDEX_VERSION, sessions: [] };
  }
}

/** Write the session index immediately. Never throws. */
function writeSessionIndex(index: SessionIndex): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(index));
  } catch {
    // Ignore quota failures — session list is best-effort.
  }
}

// ---------------------------------------------------------------------------
// Session metadata interface exposed to components.
// ---------------------------------------------------------------------------

export interface SessionMetadata {
  sessionId: string;
  title: string;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  /** When true, the session has no segments yet — it appears as a draft in the sidebar. */
  isDraft?: boolean;
  /** Capture source the session was recorded with; undefined when unknown. */
  captureMode?: CaptureMode;
}

export interface SessionWithMetadata {
  sessionId: string;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt: number | null;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSessionInput {
  sessionId?: string;
  /** Omit to keep an existing entry's title. */
  title?: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt?: number | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Tell the sidebar rail (and home list) the index changed. Best-effort. */
function notifySessionsChanged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('mn:sessions-changed'));
  }
}

let persistRequested = false;

/** List all persisted sessions, sorted newest first. */
export function listSessions(): SessionMetadata[] {
  const index = readSessionIndex();
  return index.sessions
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Create or update a session entry in the index.
 * Does NOT clear the autosave key — the meeting view handles that.
 */
export function persistSession(input: CreateSessionInput): string {
  const index = readSessionIndex();
  const now = Date.now();

  // Determine the session ID: explicit param wins, otherwise generate.
  const sessionId = input.sessionId ?? generateSessionId();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  const existing = existingIdx >= 0 ? index.sessions[existingIdx] : null;
  const finalTitle =
    typeof input.title === 'string' ? input.title : existing?.title ?? 'Untitled meeting';
  const segments = Array.isArray(input.segments)
    ? input.segments.filter((s) => s && s.final === true)
    : [];
  const startedAt = typeof input.startedAt === 'number' ? input.startedAt : null;

  // An empty store (just reset, or a session opened before its transcript
  // loaded) must not zero the counts of a session that has a transcript.
  let segmentCount = existing?.segmentCount ?? 0;
  let durationSeconds = existing?.durationSeconds ?? null;
  if (segments.length > 0) {
    segmentCount = segments.length;
    durationSeconds = transcriptDuration(segments);
  }

  const entry: SessionEntry = {
    version: INDEX_VERSION,
    sessionId,
    title: finalTitle,
    segmentCount,
    durationSeconds,
    createdAt: existing?.createdAt ?? startedAt ?? now,
    updatedAt: now,
    isDraft: segmentCount > 0 ? false : existing?.isDraft ?? true,
    ...(existing?.captureMode ? { captureMode: existing.captureMode } : {}),
  };

  if (existing) {
    index.sessions[existingIdx] = entry;
  } else {
    index.sessions.push(entry);
  }

  writeSessionIndex(index);
  saveSessionTranscript({
    sessionId,
    title: finalTitle,
    segments,
    speakers: input.speakers ?? {},
    startedAt,
  });
  // First real meeting saved: ask the browser once not to evict our storage.
  if (segmentCount > 0 && !persistRequested) {
    persistRequested = true;
    void requestPersistentStorage();
  }
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return sessionId;
}

/** Span from the earliest start to the latest end, in whole seconds. */
function transcriptDuration(segments: Segment[]): number {
  // A loop, not Math.min(...spread): the spread overflows the call stack on
  // very long transcripts.
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const s of segments) {
    if (s.start < minStart) minStart = s.start;
    if (s.end > maxEnd) maxEnd = s.end;
  }
  return Math.round(maxEnd - minStart);
}

/**
 * Create a draft session entry (title only, no segments).
 * The session appears in the sidebar immediately; recording
 * converts it from draft → active by calling persistSession.
 */
export function createDraftSession(title: string): string {
  const index = readSessionIndex();
  const now = Date.now();
  const sessionId = generateSessionId();
  const finalTitle = typeof title === 'string' ? title : 'Untitled meeting';

  const entry: SessionEntry = {
    version: INDEX_VERSION,
    sessionId,
    title: finalTitle,
    segmentCount: 0,
    durationSeconds: null,
    createdAt: now,
    updatedAt: now,
    isDraft: true,
  };

  index.sessions.push(entry);
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return sessionId;
}

/**
 * Mark an existing session as no longer a draft (e.g. when recording starts).
 */
export function unmarkDraft(sessionId: string): void {
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return;

  const existing = index.sessions[existingIdx];
  index.sessions[existingIdx] = {
    ...existing,
    isDraft: false,
    updatedAt: Date.now(),
  };
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
}

/** Record the capture source a session is being recorded with. */
export function setSessionCaptureMode(sessionId: string, captureMode: CaptureMode): void {
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return;
  index.sessions[existingIdx] = { ...index.sessions[existingIdx], captureMode };
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
}

/** Rename a session in the index. Returns false when no such session exists. */
export function renameSession(sessionId: string, title: string): boolean {
  if (typeof title !== 'string') return false;
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return false;
  index.sessions[existingIdx] = {
    ...index.sessions[existingIdx],
    title,
    updatedAt: Date.now(),
  };
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return true;
}

/**
 * True while `sessionId` is the session being recorded (or finishing its
 * post-stop transcript). Such a session cannot be deleted: the capture would
 * keep autosaving under a deleted id.
 */
export function isSessionRecording(sessionId: string): boolean {
  return isCaptureActive() && getTranscriptSessionId() === sessionId;
}

/**
 * Delete a session by sessionId.
 * Removes the index entry, its transcript AND any autosaved data keyed to it.
 * Returns false, deleting nothing, when the session is being recorded.
 * Never throws — other sessions are never corrupted.
 */
export function deleteSession(sessionId: string, opts: { deletedOnServer?: boolean } = {}): boolean {
  if (isSessionRecording(sessionId)) return false;
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx >= 0) {
    index.sessions.splice(existingIdx, 1);
    writeSessionIndex(index);
    notifySessionsChanged();
  }
  removeSessionTranscript(sessionId);
  removeSpeakerState(sessionId);
  // A meeting the DB already deleted (`server-sync.ts`) needs no delete sent.
  if (!opts.deletedOnServer) queueMeetingDelete(sessionId);

  // The store outlives the route: drop the deleted session's in-memory
  // transcript (idle here — a live capture returned above).
  if (getTranscriptSessionId() === sessionId) clearIdleSession();

  // Also clean up the autosave if it points to this session
  try {
    const autosaved = loadAutosavedSession();
    // Older builds saved under a per-tab id rather than the session's, so
    // an autosave matching no remaining session is dropped too — unless it
    // is the store's own session, which may simply not be indexed yet.
    const orphaned =
      autosaved &&
      autosaved.sessionId !== getTranscriptSessionId() &&
      !index.sessions.some((s) => s.sessionId === autosaved.sessionId);
    if (autosaved && (autosaved.sessionId === sessionId || orphaned)) {
      clearAutosavedSession();
    }
  } catch {
    // Best-effort — the index cleanup already happened.
  }
  return existingIdx >= 0;
}

/**
 * Empty a session's transcript so it can be recorded from 00:00 again, keeping
 * the session itself (title, date). Drops the per-session transcript, the
 * autosave snapshot when it belongs to this session, and — for the session the
 * store holds — the in-memory lines, speakers, start time and diarization turns.
 * Returns false, changing nothing, while the session is being recorded or when
 * it is unknown.
 */
export function clearSessionTranscript(sessionId: string): boolean {
  if (isSessionRecording(sessionId)) return false;
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return false;

  index.sessions[existingIdx] = {
    ...index.sessions[existingIdx],
    segmentCount: 0,
    durationSeconds: null,
    isDraft: true,
    updatedAt: Date.now(),
  };
  writeSessionIndex(index);
  removeSessionTranscript(sessionId);
  // Its speakers go with the transcript: a new recording numbers them afresh.
  removeSpeakerState(sessionId);
  queueMeetingSync(sessionId);

  try {
    const autosaved = loadAutosavedSession();
    if (autosaved && autosaved.sessionId === sessionId) clearAutosavedSession();
  } catch {
    // Best-effort — the transcript itself is already gone.
  }

  if (getTranscriptSessionId() === sessionId) {
    clearIdleSession();
    bindTranscriptSession(sessionId);
    resetDiarization();
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('mn:sessions-changed'));
  }
  return true;
}

/**
 * Load a session's own transcript. Falls back to the autosave slot when it
 * belongs to this session (a crash before the per-session key existed), and
 * refreshes the index's counts, which go stale when a tab dies mid-recording.
 */
export function openSession(sessionId: string): AutosavedSession | null {
  let transcript = loadSessionTranscript(sessionId);
  if (!transcript) {
    const autosaved = loadAutosavedSession();
    if (autosaved && autosaved.sessionId === sessionId) transcript = autosaved;
  }
  if (!transcript || transcript.segments.length === 0) return transcript;

  const index = readSessionIndex();
  const entry = index.sessions.find((s) => s.sessionId === sessionId);
  if (entry && entry.segmentCount !== transcript.segments.length) {
    persistSession({
      sessionId,
      segments: transcript.segments,
      speakers: transcript.speakers,
      startedAt: transcript.startedAt,
    });
  }
  return transcript;
}

/**
 * Copy the autosave slot into its session's own storage and index entry,
 * so clearing the slot (a new Record) cannot lose that transcript.
 * Returns the archived session id, or null when there was nothing to keep.
 */
export function archiveAutosavedSession(): string | null {
  try {
    const autosaved = loadAutosavedSession();
    if (!autosaved) return null;
    return persistSession({
      sessionId: autosaved.sessionId,
      title: autosaved.title,
      segments: autosaved.segments,
      speakers: autosaved.speakers,
      startedAt: autosaved.startedAt,
    });
  } catch {
    return null;
  }
}

/**
 * The index entry of a meeting in the server's DB (`pullFromServer` in
 * `server-sync.ts`) replaces this browser's. Queues nothing, since the server
 * already has it.
 */
export function adoptMeetingSummary(row: MeetingSummaryRow): void {
  const index = readSessionIndex();
  const entry: SessionEntry = {
    version: INDEX_VERSION,
    sessionId: row.id,
    title: row.title,
    segmentCount: row.segmentCount,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDraft: row.isDraft,
    ...(row.captureMode ? { captureMode: row.captureMode } : {}),
  };
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === row.id);
  if (existingIdx >= 0) index.sessions[existingIdx] = entry;
  else index.sessions.push(entry);
  writeSessionIndex(index);
  notifySessionsChanged();
}

/**
 * A meeting's transcript and notes from the server's DB. With `replace` they
 * replace this browser's copy; without, only what this browser lacks is
 * filled in, so unsent local edits survive.
 */
export function cacheMeetingContent(meeting: StoredMeeting, opts: { replace?: boolean } = {}): void {
  if (opts.replace || !loadSessionTranscript(meeting.id)) {
    saveSessionTranscript({
      sessionId: meeting.id,
      title: meeting.title,
      segments: meeting.segments.map((s) => ({ ...s, final: true })),
      speakers: meeting.speakers,
      startedAt: meeting.startedAt,
    });
  }
  if (opts.replace || !hasLocalNotes(meeting.id)) adoptNotes(meeting.id, meeting.notes);
}

/** Drop this browser's copy of a meeting's transcript and notes once the DB holds them. */
export function evictMeetingContent(sessionId: string): void {
  removeSessionTranscript(sessionId);
  try {
    localStorage.removeItem(notesKey(sessionId));
  } catch {
    // Best-effort: a copy left behind is only a cache.
  }
}

/** Take in a whole meeting from the server's DB: index entry, transcript and notes. */
export function adoptStoredMeeting(meeting: StoredMeeting): void {
  adoptMeetingSummary({
    id: meeting.id,
    title: meeting.title,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    startedAt: meeting.startedAt,
    durationSeconds: meeting.durationSeconds,
    segmentCount: meeting.segments.length,
    captureMode: meeting.captureMode,
    isDraft: meeting.segments.length === 0,
    speakers: [],
  });
  cacheMeetingContent(meeting, { replace: true });
}

/**
 * Restore a full session (segments + speakers) given its sessionId.
 * Returns the session data, or null when no matching index entry exists.
 */
export function getFullSession(
  sessionId: string,
  segments?: Segment[],
  speakers?: Record<string, Speaker>,
  startedAt: number | null = null
): SessionWithMetadata | null {
  const index = readSessionIndex();
  const entry = index.sessions.find((s) => s.sessionId === sessionId);
  if (!entry) return null;

  // Without explicit data, return the session's own persisted transcript.
  if (segments === undefined) {
    const transcript = loadSessionTranscript(sessionId);
    segments = transcript?.segments ?? [];
    speakers = speakers ?? transcript?.speakers;
    startedAt = startedAt ?? transcript?.startedAt ?? null;
  }

  return {
    sessionId: entry.sessionId,
    title: entry.title,
    segments,
    speakers: speakers ?? {},
    startedAt,
    segmentCount: entry.segmentCount,
    durationSeconds: entry.durationSeconds,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * Get a single session's metadata from the index.
 */
export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  const index = readSessionIndex();
  const entry = index.sessions.find((s) => s.sessionId === sessionId);
  if (!entry) return null;
  return {
    sessionId: entry.sessionId,
    title: entry.title,
    segmentCount: entry.segmentCount,
    durationSeconds: entry.durationSeconds,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    isDraft: entry.isDraft,
    captureMode: entry.captureMode,
  };
}

/**
 * Check if a session exists in the index.
 */
export function sessionExists(sessionId: string): boolean {
  const index = readSessionIndex();
  return index.sessions.some((s) => s.sessionId === sessionId);
}

/**
 * True when the session already has recorded text: the Record button should
 * then ask "append or start new" instead of recording straight over it.
 * Checks the live store, the session's own key and the autosave slot.
 */
export function sessionHasTranscript(sessionId: string): boolean {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return false;
  const hasFinal = (segs: Segment[] | undefined) => !!segs && segs.some((s) => s && s.final === true);
  if (getTranscriptSessionId() === sessionId && hasFinal(getState().segments)) return true;
  if (hasFinal(loadSessionTranscript(sessionId)?.segments)) return true;
  const autosaved = loadAutosavedSession();
  return !!autosaved && autosaved.sessionId === sessionId && hasFinal(autosaved.segments);
}

export type RecordInSessionMode = 'append' | 'new';

/**
 * Prepare the store to record in a session that already has a transcript.
 * Call it, then `meeting.start(...)`, from the Record handler.
 *
 * - 'append': the transcript stays and the new audio continues it (segments
 *   and speakers kept; new timestamps start after the previous end). Returns
 *   `sessionId`.
 * - 'new': the old transcript is archived under its own id and a fresh draft
 *   session is created and bound. Returns the new id; the caller navigates to it.
 *
 * Returns null, changing nothing, while a capture is active or the session
 * has no transcript to append to.
 */
export function startRecordingInSession(
  sessionId: string,
  mode: RecordInSessionMode,
  opts: { title?: string } = {}
): string | null {
  if (isCaptureActive()) return null;
  flushAutosave();
  archiveAutosavedSession();

  if (mode === 'append') {
    const s = getState();
    if (getTranscriptSessionId() !== sessionId || s.segments.length === 0) {
      const transcript = openSession(sessionId);
      if (!transcript || transcript.segments.length === 0) return null;
      if (!loadIdleSession(sessionId, { ...transcript, startedAt: transcript.startedAt ?? null })) return null;
    } else {
      persistSession({ sessionId, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
    }
    bindTranscriptSession(sessionId);
    if (!armAppend()) return null;
    return sessionId;
  }

  // 'new': keep the old transcript under its own key, then leave it behind.
  const s = getState();
  if (getTranscriptSessionId() === sessionId && s.segments.length > 0) {
    persistSession({ sessionId, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
  }
  clearAutosavedSession();
  clearIdleSession();
  const freshId = createDraftSession(opts.title ?? 'Untitled meeting');
  bindTranscriptSession(freshId);
  return freshId;
}

/** Generate a UUID-like session identifier. Never throws. */
function generateSessionId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
  } catch {
    // Ignore
  }
  return `mn-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}
