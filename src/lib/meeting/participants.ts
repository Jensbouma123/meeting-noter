/**
 * Who is in a meeting: a short list of names per session, plus the names used
 * most recently (one-click suggestions for the next meeting). The list is
 * meeting data like the notes: the meetings DB holds it (`participants` on
 * `StoredMeeting`), and the `localStorage` copy is a cache that every change
 * queues for the server and `server-sync.ts` drops and fetches back. Names
 * also join the word list through `addNameToVocabulary`, so transcripts spell
 * them right. Nothing here assigns a name to a speaker.
 */
import { useSyncExternalStore } from 'react';
import { addNameToVocabulary } from '@/lib/vocabulary/names';
import { queueMeetingSync } from './server-sync';

const SESSION_KEY_PREFIX = 'mn.participants.';
const SESSION_KEY_SUFFIX = '.v1';
export const RECENT_PARTICIPANTS_KEY = 'mn.participants.recent.v1';
export const MAX_RECENT_PARTICIPANTS = 12;
const MAX_NAME_LENGTH = 40;

export const sessionParticipantsKey = (sessionId: string): string =>
  `${SESSION_KEY_PREFIX}${sessionId}${SESSION_KEY_SUFFIX}`;

/** Split typed text on commas / semicolons / newlines into clean names. */
export function parseParticipantNames(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH))
    .filter(Boolean);
}

/** `names` without blanks or case-insensitive duplicates, first spelling wins. */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const clean = name.trim().replace(/\s+/g, ' ');
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: string[] }>();
const NONE: string[] = [];

function readList(key: string): string[] {
  if (typeof window === 'undefined') return NONE;
  try {
    const raw = window.localStorage.getItem(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value;
    let value = NONE;
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) value = uniqueNames(parsed.filter((n): n is string => typeof n === 'string'));
    }
    cache.set(key, { raw, value });
    return value;
  } catch {
    return NONE;
  }
}

function writeList(key: string, names: string[]): void {
  try {
    if (names.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(names));
  } catch {
    // Best-effort: the list just is not remembered.
  }
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(SESSION_KEY_PREFIX)) fn();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** The meeting's participants (empty when none were set). */
export function getParticipants(sessionId: string): string[] {
  return readList(sessionParticipantsKey(sessionId));
}

/** The stored list, or null when the question was never answered on this browser (or the copy was dropped). */
export function getStoredParticipants(sessionId: string): string[] | null {
  return hasAskedParticipants(sessionId) ? getParticipants(sessionId) : null;
}

/** Take in the DB's list for a meeting (`cacheMeetingContent`). Queues nothing: the server already has it. */
export function adoptParticipants(sessionId: string, names: readonly string[] | null): void {
  try {
    if (names === null) window.localStorage.removeItem(sessionParticipantsKey(sessionId));
    else window.localStorage.setItem(sessionParticipantsKey(sessionId), JSON.stringify(uniqueNames(names)));
  } catch {
    // Best-effort, like every other local write.
  }
  for (const fn of listeners) fn();
}

/** Drop this browser's copy of a meeting's list (delete, or once the DB holds it). */
export function removeParticipants(sessionId: string): void {
  adoptParticipants(sessionId, null);
}

/** Every per-meeting list key (not the recents), for the storage sweep. */
export function isSessionParticipantsKey(key: string): boolean {
  return key.startsWith(SESSION_KEY_PREFIX) && key.endsWith(SESSION_KEY_SUFFIX) && key !== RECENT_PARTICIPANTS_KEY;
}

/** Whether the "Who is in this meeting?" step was already answered (even with Skip). */
export function hasAskedParticipants(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(sessionParticipantsKey(sessionId)) !== null;
  } catch {
    return false;
  }
}

/** Recently used names, newest first. */
export function getRecentParticipants(): string[] {
  return readList(RECENT_PARTICIPANTS_KEY);
}

/** Save the meeting's participants, remember them as recents and add them to the word list. */
export function setParticipants(sessionId: string, names: readonly string[]): string[] {
  const clean = uniqueNames(names);
  // An empty list is stored as `[]` so a skipped step is not asked twice.
  try {
    window.localStorage.setItem(sessionParticipantsKey(sessionId), JSON.stringify(clean));
  } catch {
    // Best-effort.
  }
  queueMeetingSync(sessionId);
  for (const fn of listeners) fn();
  if (clean.length > 0) {
    for (const name of clean) addNameToVocabulary(name);
    writeList(
      RECENT_PARTICIPANTS_KEY,
      uniqueNames([...clean, ...getRecentParticipants()]).slice(0, MAX_RECENT_PARTICIPANTS),
    );
  }
  return clean;
}

/** Mark the step as answered without naming anyone (Skip). */
export function skipParticipants(sessionId: string): void {
  if (!hasAskedParticipants(sessionId)) setParticipants(sessionId, []);
}

export function useParticipants(sessionId: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => getParticipants(sessionId),
    () => NONE,
  );
}

export function useRecentParticipants(): string[] {
  return useSyncExternalStore(subscribe, getRecentParticipants, () => NONE);
}

/** "Speaker 2" / "Spreker 3": the label the app hands out until someone is named. */
export function isUnnamedSpeakerLabel(label: string): boolean {
  return /^(speaker|spreker)(\s+\S+)?$/i.test(label.trim());
}

/** The label a speaker goes back to when its name is cleared. */
export function defaultSpeakerLabel(speakerId: string, source: 'mic' | 'system', youLabel: string): string {
  return source === 'mic' ? youLabel : `Speaker ${speakerId}`;
}

/** Participants no speaker carries yet (case-insensitive), in list order. */
export function unassignedParticipants(participants: readonly string[], speakerLabels: readonly string[]): string[] {
  const used = new Set(speakerLabels.map((l) => l.trim().toLowerCase()));
  return participants.filter((p) => !used.has(p.toLowerCase()));
}
