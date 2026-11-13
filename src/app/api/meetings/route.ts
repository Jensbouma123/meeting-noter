import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { storageFailure } from '@/lib/meeting-db/http';
import { meetingsDataDir } from '@/lib/meeting-db/paths';
import { meetingStore } from '@/lib/meeting-db/meeting-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  try {
    const { db } = meetingStore();
    const params = new URL(request.url).searchParams;
    const q = params.get('q');
    const int = (name: string) => {
      const n = Number.parseInt(params.get(name) ?? '', 10);
      return Number.isNaN(n) ? undefined : n;
    };
    const meetings = q ? db.search(q, { limit: 100 }) : db.list({ limit: int('limit'), offset: int('offset') });
    const deletedIdsForBrowserCleanup = q ? undefined : db.deletedIds();
    return Response.json({ ok: true, dataDir: meetingsDataDir(), meetings, deleted: deletedIdsForBrowserCleanup });
  } catch (err) {
    return storageFailure(err);
  }
}

export function DELETE(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  try {
    return Response.json({ ok: true, deleted: meetingStore().deleteAll() });
  } catch (err) {
    return storageFailure(err);
  }
}
