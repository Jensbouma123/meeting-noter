import type { Speaker } from './types';
import type { AutosaveInput, AutosavedSession } from './types/autosave';
import { AUTOSAVE_VERSION, sanitizeSnapshot } from './autosave-snapshot';
import { loadSessionTranscript, saveSessionTranscript } from './session-transcript-storage';
import { queueMeetingSync } from './server-sync';
import { isStorageAvailable } from './storage-available';
import { isCaptureActive } from './store';

export const AUTOSAVE_KEY = 'mn.autosave.v1';
export const AUTOSAVE_THROTTLE_MS = 1000;
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInput: AutosaveInput | null = null;

function transcriptChanged(a: AutosavedSession | null, b: AutosavedSession | null): boolean {
  if (!b) return false;
  if (!a) return true;
  return JSON.stringify([a.segments, a.speakers]) !== JSON.stringify([b.segments, b.speakers]);
}

export function saveAutosavedSession(input: AutosaveInput): void {
  if (!isStorageAvailable()) return;
  try {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot) return;
    if (snapshot.segments.length === 0) return;
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch {
    return;
  }
  const before = isCaptureActive() ? undefined : loadSessionTranscript(input.sessionId);
  saveSessionTranscript(input);
  if (before !== undefined && transcriptChanged(before, loadSessionTranscript(input.sessionId))) {
    queueMeetingSync(input.sessionId);
  }
}

function flushPending(): void {
  throttleTimer = null;
  const input = pendingInput;
  pendingInput = null;
  if (input) saveAutosavedSession(input);
}

export function scheduleAutosave(input: AutosaveInput): void {
  try {
    pendingInput = input;
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(flushPending, AUTOSAVE_THROTTLE_MS);
  } catch {
    try {
      saveAutosavedSession(input);
    } catch {
      return;
    }
  }
}

export function cancelPendingAutosave(sessionId: string): void {
  if (pendingInput?.sessionId !== sessionId) return;
  if (throttleTimer !== null) clearTimeout(throttleTimer);
  throttleTimer = null;
  pendingInput = null;
}

export function flushAutosave(): void {
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      flushPending();
    }
  } catch {
    return;
  }
}

export function dropPendingAutosave(): void {
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
  } catch {
    pendingInput = null;
  }
  pendingInput = null;
}

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

export function clearAutosavedSession(): void {
  dropPendingAutosave();
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    return;
  }
}
