import { AUTOSAVE_VERSION } from './autosave-snapshot';
import { loadSessionTranscript } from './session-transcript-storage';
import { isStorageAvailable } from './storage-available';
import type { Speaker } from './types';
import type { AutosavedSession } from './types/autosave';

export const AUTOSAVE_KEY = 'mn.autosave.v1';
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function pointerPayload(sessionId: string): string {
  return JSON.stringify({ version: AUTOSAVE_VERSION, sessionId, pointer: true });
}

export function writeAutosavePointer(sessionId: string): void {
  try {
    const payload = pointerPayload(sessionId);
    if (window.localStorage.getItem(AUTOSAVE_KEY) !== payload) {
      window.localStorage.setItem(AUTOSAVE_KEY, payload);
    }
  } catch {
    return;
  }
}

function isFresh(savedAt: unknown): savedAt is number {
  return typeof savedAt === 'number' && Date.now() - savedAt <= MAX_SNAPSHOT_AGE_MS;
}

function readSlot(inlineOnly: boolean): AutosavedSession | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    if (inlineOnly && raw.includes('"pointer":true')) return null;
    const parsed = JSON.parse(raw) as Partial<AutosavedSession> & { pointer?: boolean };
    if (!parsed || parsed.version !== AUTOSAVE_VERSION) return null;
    if (typeof parsed.sessionId !== 'string' || parsed.sessionId.length === 0) return null;
    if (parsed.pointer === true) {
      const stored = loadSessionTranscript(parsed.sessionId);
      return stored && stored.segments.length > 0 && isFresh(stored.savedAt) ? stored : null;
    }
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) return null;
    if (!isFresh(parsed.savedAt)) return null;
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

export function loadAutosavedSession(): AutosavedSession | null {
  return readSlot(false);
}

export function loadInlineAutosave(): AutosavedSession | null {
  return readSlot(true);
}
