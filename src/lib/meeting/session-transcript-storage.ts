import { AUTOSAVE_VERSION, sanitizeSnapshot } from './autosave-snapshot';
import { isStorageAvailable } from './storage-available';
import type { Speaker } from './types';
import type { AutosaveInput, AutosavedSession } from './types/autosave';

const SESSION_KEY_PREFIX = 'mn.session.';
const SESSION_KEY_SUFFIX = '.v1';

export function sessionTranscriptKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}${SESSION_KEY_SUFFIX}`;
}

export function saveSessionTranscript(input: AutosaveInput): void {
  if (!isStorageAvailable()) return;
  try {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot || snapshot.segments.length === 0) return;
    window.localStorage.setItem(sessionTranscriptKey(snapshot.sessionId), JSON.stringify(snapshot));
  } catch {
    return;
  }
}

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

export function removeSessionTranscript(sessionId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(sessionTranscriptKey(sessionId));
  } catch {
    return;
  }
}
