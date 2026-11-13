import type { PendingSync } from './types/server-sync';

export const PENDING_KEY = 'mn.sync.pending.v1';
export const SYNCED_KEY = 'mn.sync.synced.v1';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function readPending(): PendingSync {
  const p = readJson<Partial<PendingSync>>(PENDING_KEY, {});
  return {
    save: Array.isArray(p.save) ? p.save.filter((x) => typeof x === 'string') : [],
    remove: Array.isArray(p.remove) ? p.remove.filter((x) => typeof x === 'string') : [],
  };
}

export function markSynced(id: string, updatedAt: number | null): void {
  const synced = readJson<Record<string, number>>(SYNCED_KEY, {});
  if (updatedAt === null) delete synced[id];
  else synced[id] = updatedAt;
  writeJson(SYNCED_KEY, synced);
}
