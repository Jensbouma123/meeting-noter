/**
 * `POST /api/meetings/import` — the one-time move of the browser's meetings
 * into the DB (`migrateBrowserMeetings`). Body `{ meetings: StoredMeeting[] }`.
 * Idempotent: a meeting the DB already has at the same or a newer
 * `updatedAt` is skipped, so a retried or repeated import changes nothing.
 * `firstImport` is true only for the first import this DB ever took.
 */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { MAX_IMPORT_BODY_BYTES, failure, readJson, storageFailure } from '@/lib/meeting-db/http';
import { meetingsDataDir } from '@/lib/meeting-db/paths';
import { meetingStore } from '@/lib/meeting-db/store';
import { parseStoredMeeting } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const parsed = await readJson(request, MAX_IMPORT_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const list = body && typeof body === 'object' ? (body as { meetings?: unknown }).meetings : undefined;
  if (!Array.isArray(list)) return failure('bad-import', 400);
  try {
    const store = meetingStore();
    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    for (const raw of list) {
      const meeting = parseStoredMeeting(raw);
      if (!meeting) invalid += 1;
      else if (store.save(meeting, { onlyIfNewer: true }) === 'written') imported += 1;
      else skipped += 1;
    }
    // Only the DB's first import is news to the user; a cleared browser importing again is not.
    const firstImport = store.db.setMetaOnce('browser-import-at', String(Date.now()));
    return Response.json({ ok: true, imported, skipped, invalid, firstImport, dataDir: meetingsDataDir() });
  } catch (err) {
    return storageFailure(err);
  }
}
