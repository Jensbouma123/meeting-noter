import { flushServerSync } from './sync-flush';
import { migrateBrowserMeetings } from './sync-migrate';
import { pullFromServer } from './sync-pull';
import { RETRY_MS, syncState } from './sync-state';
import { PENDING_KEY, readPending, writeJson } from './sync-storage';

export async function searchMeetingIds(query: string): Promise<Set<string> | null> {
  if (!syncState.enabled || !query.trim()) return null;
  try {
    const res = await fetch(`/api/meetings?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return new Set(((await res.json()) as { meetings: { id: string }[] }).meetings.map((m) => m.id));
  } catch {
    return null;
  }
}

export async function startServerSync(): Promise<void> {
  if (syncState.enabled) return;
  syncState.enabled = true;
  if (typeof window !== 'undefined') {
    syncState.onOnline = () => void flushServerSync().then(pullFromServer);
    window.addEventListener('online', syncState.onOnline);
    syncState.retryTimer = setInterval(() => {
      const p = readPending();
      if (p.save.length > 0 || p.remove.length > 0) void flushServerSync();
    }, RETRY_MS);
  }
  await migrateBrowserMeetings();
  await flushServerSync();
  await pullFromServer();
}

export async function deleteAllOnServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/meetings', { method: 'DELETE' });
    if (res.ok) writeJson(PENDING_KEY, { save: [], remove: [] });
    return res.ok;
  } catch {
    return false;
  }
}

export function stopServerSyncForTests(): void {
  syncState.enabled = false;
  if (syncState.timer !== null) clearTimeout(syncState.timer);
  if (syncState.retryTimer !== null) clearInterval(syncState.retryTimer);
  if (syncState.onOnline) window.removeEventListener('online', syncState.onOnline);
  syncState.onOnline = null;
  syncState.timer = null;
  syncState.retryTimer = null;
  syncState.flushing = null;
  syncState.generation.clear();
}
