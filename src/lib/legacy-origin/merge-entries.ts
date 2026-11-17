import { SESSIONS_INDEX_KEY } from './constants';
import type { LegacyEntry, LegacySessionIndex as Index } from './types';

function readIndex(raw: string | null): Index | null {
  try {
    const parsed = raw ? (JSON.parse(raw) as Index) : null;
    return parsed && Array.isArray(parsed.sessions) ? parsed : null;
  } catch {
    return null;
  }
}

function mergeIndex(current: string, legacy: string): string | null {
  const ours = readIndex(current);
  const theirs = readIndex(legacy);
  if (!ours || !theirs || ours.version !== theirs.version) return null;
  const known = new Set(ours.sessions.map((s) => s.sessionId));
  const added = theirs.sessions.filter((s) => s && typeof s.sessionId === 'string' && !known.has(s.sessionId));
  return added.length ? JSON.stringify({ ...ours, sessions: [...ours.sessions, ...added] }) : null;
}

export function mergeEntries(storage: Storage, entries: readonly LegacyEntry[]): number {
  let written = 0;
  for (const [key, value] of entries) {
    const current = storage.getItem(key);
    const next = current === null ? value : key === SESSIONS_INDEX_KEY ? mergeIndex(current, value) : null;
    if (next === null) continue;
    try {
      storage.setItem(key, next);
      written += 1;
    } catch {
      continue;
    }
  }
  return written;
}
