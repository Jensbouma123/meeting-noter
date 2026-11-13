import { useSyncExternalStore } from 'react';
import { addNameToVocabulary } from '@/lib/vocabulary/names';
import { uniqueNames } from './participant-names';
import { queueMeetingSync } from './sync-queue';

const SESSION_KEY_PREFIX = 'mn.participants.';
const SESSION_KEY_SUFFIX = '.v1';
export const RECENT_PARTICIPANTS_KEY = 'mn.participants.recent.v1';
export const MAX_RECENT_PARTICIPANTS = 12;

export const sessionParticipantsKey = (sessionId: string): string =>
  `${SESSION_KEY_PREFIX}${sessionId}${SESSION_KEY_SUFFIX}`;

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: string[] }>();
export const NONE: string[] = [];

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
  }
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
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

export function getParticipants(sessionId: string): string[] {
  return readList(sessionParticipantsKey(sessionId));
}

export function getStoredParticipants(sessionId: string): string[] | null {
  return hasAskedParticipants(sessionId) ? getParticipants(sessionId) : null;
}

export function adoptParticipants(sessionId: string, names: readonly string[] | null): void {
  try {
    if (names === null) window.localStorage.removeItem(sessionParticipantsKey(sessionId));
    else window.localStorage.setItem(sessionParticipantsKey(sessionId), JSON.stringify(uniqueNames(names)));
  } catch {
  }
  for (const fn of listeners) fn();
}

export function removeParticipants(sessionId: string): void {
  adoptParticipants(sessionId, null);
}

export function isSessionParticipantsKey(key: string): boolean {
  return key.startsWith(SESSION_KEY_PREFIX) && key.endsWith(SESSION_KEY_SUFFIX) && key !== RECENT_PARTICIPANTS_KEY;
}

export function hasAskedParticipants(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(sessionParticipantsKey(sessionId)) !== null;
  } catch {
    return false;
  }
}

export function getRecentParticipants(): string[] {
  return readList(RECENT_PARTICIPANTS_KEY);
}

export function setParticipants(sessionId: string, names: readonly string[]): string[] {
  const clean = uniqueNames(names);
  try {
    window.localStorage.setItem(sessionParticipantsKey(sessionId), JSON.stringify(clean));
  } catch {
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
