import type { StoredMeeting } from '@/lib/meeting-db/types';
import { loadAutosavedSession } from './autosave';
import { archiveAutosavedSession, getSessionMetadata } from './session-open';
import { listSessions } from './session-crud';
import { isCaptureActive } from './transcript-session';
import { buildStoredMeeting } from './stored-meeting';
import { markSynced, readJson, writeJson } from './sync-storage';
import type { MigrationResult } from './types/server-sync';

export const MIGRATED_KEY = 'mn.db-migrated.v1';
export const MIGRATED_EVENT = 'mn:meetings-migrated';

export async function migrateBrowserMeetings(): Promise<MigrationResult | null> {
  if (readJson<unknown>(MIGRATED_KEY, null)) return null;
  const autosaved = loadAutosavedSession();
  if (autosaved && !isCaptureActive() && !getSessionMetadata(autosaved.sessionId)) archiveAutosavedSession();
  const meetings = listSessions()
    .map((s) => buildStoredMeeting(s.sessionId, s.updatedAt))
    .filter((m): m is StoredMeeting => m !== null);
  let result: MigrationResult;
  let firstImport = true;
  try {
    const res = await fetch('/api/meetings/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ meetings }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as MigrationResult & { ok: boolean; firstImport?: boolean };
    firstImport = body.firstImport !== false;
    result = { imported: body.imported, skipped: body.skipped, invalid: body.invalid, dataDir: body.dataDir };
  } catch {
    return null;
  }
  for (const m of meetings) markSynced(m.id, m.updatedAt);
  writeJson(MIGRATED_KEY, { at: Date.now(), ...result });
  if (firstImport && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent<MigrationResult>(MIGRATED_EVENT, { detail: result }));
  }
  return result;
}
