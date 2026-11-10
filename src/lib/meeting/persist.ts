import { isSerializedSpeakerState, type SpeakerStates } from '@/lib/diarization/browser/speaker-state';
import type { Segment, Source, Speaker } from './types';

/**
 * Crash-safe autosave for the live meeting transcript.
 *
 * Persists only *final* segments (partials re-fire at ~2-3 Hz and would
 * churn localStorage) plus speaker labels, the meeting title and a
 * client-side session id. All writes are throttled (~1 s, trailing edge)
 * and every localStorage access is wrapped in try/catch so private-mode
 * / quota failures can never crash the live path.
 */

export const AUTOSAVE_KEY = 'mn.autosave.v1';
const AUTOSAVE_VERSION = 1;
/** Trailing-edge throttle interval for autosave writes. */
export const AUTOSAVE_THROTTLE_MS = 1000;
/** Snapshots older than this are treated as stale and ignored. */
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AutosaveInput {
  sessionId: string;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt?: number | null;
}

export interface AutosavedSession extends AutosaveInput {
  version: number;
  savedAt: number;
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function sanitizeSnapshot(input: AutosaveInput): AutosavedSession | null {
  try {
    if (!input || typeof input.sessionId !== 'string' || input.sessionId.length === 0) return null;
    // Finals only: partials are transient and rewrite several times a second.
    const rawSegments = Array.isArray(input.segments) ? input.segments : [];
    const segments = rawSegments
      .filter((s) => s && s.final === true && typeof s.text === 'string')
      // Word timings only serve live re-attribution, and would multiply the
      // snapshot's size against the storage quota.
      .map((s) => (s.words ? { ...s, words: undefined } : s));
    const speakers: Record<string, Speaker> =
      input.speakers && typeof input.speakers === 'object' ? input.speakers : {};
    return {
      version: AUTOSAVE_VERSION,
      savedAt: Date.now(),
      sessionId: input.sessionId,
      title: typeof input.title === 'string' ? input.title : 'Untitled meeting',
      segments,
      speakers,
      startedAt: typeof input.startedAt === 'number' ? input.startedAt : null,
    };
  } catch {
    return null;
  }
}

/** Write a snapshot immediately (unthrottled). Never throws. */
export function saveAutosavedSession(input: AutosaveInput): void {
  if (!isStorageAvailable()) return;
  try {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot) return;
    // Skip empty snapshots so a fresh page never overwrites a real session
    // with blank state before the first final segment arrives.
    if (snapshot.segments.length === 0) return;
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / serialization failures — autosave is best-effort.
  }
  // The single autosave slot is overwritten by the next session, so each
  // session also keeps its own copy.
  saveSessionTranscript(input);
}

// ---------------------------------------------------------------------------
// Per-session transcripts: one key per session, so opening an older session
// shows its own transcript rather than whatever the global slot holds.
// ---------------------------------------------------------------------------

const SESSION_KEY_PREFIX = 'mn.session.';
const SESSION_KEY_SUFFIX = '.v1';

export function sessionTranscriptKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}${SESSION_KEY_SUFFIX}`;
}

/** Write a session's transcript under its own key. Empty transcripts are skipped. Never throws. */
export function saveSessionTranscript(input: AutosaveInput): void {
  if (!isStorageAvailable()) return;
  try {
    const snapshot = sanitizeSnapshot(input);
    // An empty store (e.g. just after a reset) must not blank a saved transcript.
    if (!snapshot || snapshot.segments.length === 0) return;
    window.localStorage.setItem(sessionTranscriptKey(snapshot.sessionId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota / serialization failures — best-effort.
  }
}

/** Load a session's own transcript, or null when none. No age limit. Never throws. */
export function loadSessionTranscript(sessionId: string): AutosavedSession | null {
  if (!isStorageAvailable() || typeof sessionId !== 'string' || sessionId.length === 0) return null;
  try {
    const raw = window.localStorage.getItem(sessionTranscriptKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutosavedSession>;
    if (!parsed || parsed.version !== AUTOSAVE_VERSION || parsed.sessionId !== sessionId) return null;
    if (!Array.isArray(parsed.segments)) return null;
    return {
      version: AUTOSAVE_VERSION,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      sessionId,
      title: typeof parsed.title === 'string' ? parsed.title : 'Untitled meeting',
      segments: parsed.segments.filter((s) => s && s.final === true),
      speakers:
        parsed.speakers && typeof parsed.speakers === 'object'
          ? (parsed.speakers as Record<string, Speaker>)
          : {},
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
    };
  } catch {
    return null;
  }
}

/** Remove a session's own transcript. Never throws. */
export function removeSessionTranscript(sessionId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(sessionTranscriptKey(sessionId));
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// Per-session speaker state: the diarizer's speaker cache per source, so a
// recording appended to the session tells its speakers apart the way the
// earlier ones did (see `src/lib/diarization/browser/speaker-state.ts`).
// Kept apart from the transcript: it is ~360 KB per source, and a session
// without it (older, or never diarized) must still load.
// ---------------------------------------------------------------------------

const SPEAKER_STATE_KEY_PREFIX = 'mn.speaker-state.';
const SPEAKER_STATE_KEY_SUFFIX = '.v1';
const SPEAKER_STATE_VERSION = 1;
/** Sessions whose speaker state is kept; the least recently saved go first,
 *  so the state cannot crowd transcripts out of the storage quota. */
export const MAX_SPEAKER_STATES = 4;

interface StoredSpeakerState {
  version: number;
  sessionId: string;
  savedAt: number;
  sources: SpeakerStates;
}

export function speakerStateKey(sessionId: string): string {
  return `${SPEAKER_STATE_KEY_PREFIX}${sessionId}${SPEAKER_STATE_KEY_SUFFIX}`;
}

/** Every stored speaker state's key, least recently saved first. */
function storedSpeakerStateKeys(): string[] {
  const storage = window.localStorage;
  const found: { key: string; savedAt: number }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(SPEAKER_STATE_KEY_PREFIX) || !key.endsWith(SPEAKER_STATE_KEY_SUFFIX)) continue;
    let savedAt = 0;
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? 'null') as Partial<StoredSpeakerState> | null;
      if (parsed && typeof parsed.savedAt === 'number') savedAt = parsed.savedAt;
    } catch {
      // Unreadable: evicted first.
    }
    found.push({ key, savedAt });
  }
  return found.sort((a, b) => a.savedAt - b.savedAt).map((f) => f.key);
}

/** Store a session's speaker state, replacing what it had. Nothing to store
 *  removes it. Never throws; on a full quota, other sessions' states are
 *  dropped before this one gives up. */
export function saveSpeakerState(sessionId: string, sources: SpeakerStates): void {
  if (!isStorageAvailable() || typeof sessionId !== 'string' || sessionId.length === 0) return;
  const key = speakerStateKey(sessionId);
  try {
    if (Object.keys(sources).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const stored: StoredSpeakerState = {
      version: SPEAKER_STATE_VERSION,
      sessionId,
      savedAt: Date.now(),
      sources,
    };
    const value = JSON.stringify(stored);
    const others = storedSpeakerStateKeys().filter((k) => k !== key);
    for (const old of others.slice(0, Math.max(0, others.length - (MAX_SPEAKER_STATES - 1)))) {
      window.localStorage.removeItem(old);
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      for (const old of storedSpeakerStateKeys()) if (old !== key) window.localStorage.removeItem(old);
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Best-effort: without it the next recording numbers speakers afresh.
  }
}

/** A session's speaker state per source, or null when it has none (older
 *  sessions, a failed save). Never throws. */
export function loadSpeakerState(sessionId: string): SpeakerStates | null {
  if (!isStorageAvailable() || typeof sessionId !== 'string' || sessionId.length === 0) return null;
  try {
    const raw = window.localStorage.getItem(speakerStateKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSpeakerState>;
    if (!parsed || parsed.version !== SPEAKER_STATE_VERSION || parsed.sessionId !== sessionId) return null;
    if (!parsed.sources || typeof parsed.sources !== 'object') return null;
    const sources: SpeakerStates = {};
    for (const source of ['mic', 'system'] as Source[]) {
      const state: unknown = (parsed.sources as Record<string, unknown>)[source];
      if (isSerializedSpeakerState(state)) sources[source] = state;
    }
    return Object.keys(sources).length > 0 ? sources : null;
  } catch {
    return null;
  }
}

/** Remove a session's speaker state. Never throws. */
export function removeSpeakerState(sessionId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(speakerStateKey(sessionId));
  } catch {
    // Ignore.
  }
}

// Throttled (trailing-edge) writer. Coalesces rapid store updates into
// one localStorage write per AUTOSAVE_THROTTLE_MS window.
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInput: AutosaveInput | null = null;

function flushPending(): void {
  throttleTimer = null;
  const input = pendingInput;
  pendingInput = null;
  if (input) saveAutosavedSession(input);
}

/** Schedule an autosave write; rapid calls collapse into one per second. Never throws. */
export function scheduleAutosave(input: AutosaveInput): void {
  try {
    pendingInput = input;
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(flushPending, AUTOSAVE_THROTTLE_MS);
  } catch {
    // Timer creation failed — fall back to a direct write attempt.
    try {
      saveAutosavedSession(input);
    } catch {
      // Best-effort only.
    }
  }
}

/** Write any pending throttled snapshot immediately. Never throws. */
export function flushAutosave(): void {
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      flushPending();
    }
  } catch {
    // Best-effort only.
  }
}

/** Validate + load the last autosaved snapshot, or null when none/expired. Never throws. */
export function loadAutosavedSession(): AutosavedSession | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutosavedSession>;
    if (!parsed || parsed.version !== AUTOSAVE_VERSION) return null;
    if (typeof parsed.sessionId !== 'string' || parsed.sessionId.length === 0) return null;
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_SNAPSHOT_AGE_MS) {
      return null;
    }
    return {
      version: AUTOSAVE_VERSION,
      savedAt: parsed.savedAt,
      sessionId: parsed.sessionId,
      title: typeof parsed.title === 'string' ? parsed.title : 'Untitled meeting',
      segments: parsed.segments.filter((s) => s && s.final === true),
      speakers:
        parsed.speakers && typeof parsed.speakers === 'object'
          ? (parsed.speakers as Record<string, Speaker>)
          : {},
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
    };
  } catch {
    return null;
  }
}

/** Discard the autosaved snapshot (e.g. after resume/dismiss/new session). Never throws. */
export function clearAutosavedSession(): void {
  if (throttleTimer !== null) {
    try {
      clearTimeout(throttleTimer);
    } catch {
      // Ignore.
    }
    throttleTimer = null;
  }
  pendingInput = null;
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Ignore.
  }
}

/** Stable client-side session id for the current page lifetime. Never throws. */
let clientSessionId: string | null = null;

export function getClientSessionId(): string {
  if (clientSessionId) return clientSessionId;
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      clientSessionId = c.randomUUID();
    } else {
      clientSessionId = `mn-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
    }
  } catch {
    clientSessionId = `mn-${Date.now().toString(36)}`;
  }
  return clientSessionId as string;
}

/** Rotate the client session id (call when a brand-new recording starts). Never throws. */
export function rotateClientSessionId(): string {
  clientSessionId = null;
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
  } catch {
    // Ignore.
  }
  pendingInput = null;
  return getClientSessionId();
}
