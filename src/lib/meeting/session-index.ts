import type { SessionIndex } from './types/session-store';

export const SESSION_INDEX_VERSION = 1;
const SESSIONS_KEY = 'mn.sessions.v1';

function emptyIndex(): SessionIndex {
  return { version: SESSION_INDEX_VERSION, sessions: [] };
}

export function readSessionIndex(): SessionIndex {
  if (typeof window === 'undefined') return emptyIndex();
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return emptyIndex();
    const parsed = JSON.parse(raw) as Partial<SessionIndex>;
    if (!parsed || parsed.version !== SESSION_INDEX_VERSION) return emptyIndex();
    if (!Array.isArray(parsed.sessions)) return emptyIndex();
    return {
      version: SESSION_INDEX_VERSION,
      sessions: parsed.sessions.filter(
        (s) =>
          s &&
          typeof s.sessionId === 'string' &&
          typeof s.title === 'string' &&
          typeof s.createdAt === 'number'
      ),
    };
  } catch {
    return emptyIndex();
  }
}

export function writeSessionIndex(index: SessionIndex): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(index));
  } catch {
    return;
  }
}

export function notifySessionsChanged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('mn:sessions-changed'));
  }
}

export function generateSessionId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
  } catch {
    return fallbackSessionId();
  }
  return fallbackSessionId();
}

function fallbackSessionId(): string {
  return `mn-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}
