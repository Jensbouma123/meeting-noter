/**
 * `GET /api/meetings` — every stored meeting without its transcript, newest
 * first; `?q=words` searches titles, summaries and transcripts instead.
 */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { storageFailure } from '@/lib/meeting-db/http';
import { meetingsDataDir } from '@/lib/meeting-db/paths';
import { meetingStore } from '@/lib/meeting-db/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  try {
    const { db } = meetingStore();
    const q = new URL(request.url).searchParams.get('q');
    const meetings = q ? db.search(q, { limit: 100 }) : db.list();
    return Response.json({ ok: true, dataDir: meetingsDataDir(), meetings });
  } catch (err) {
    return storageFailure(err);
  }
}
