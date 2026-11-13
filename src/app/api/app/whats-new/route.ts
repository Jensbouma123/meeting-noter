import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';
import { failure, storageFailure } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/meeting-store';
import { markWhatsNewSeen, shouldShowWhatsNew } from '@/lib/whats-new/decide';
import { fetchReleaseNotes } from '@/lib/whats-new/fetch-notes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const version = lifecycle().install.current;
  try {
    if (!shouldShowWhatsNew(meetingStore().db, version)) return Response.json({ show: false, version, notes: null, pageUrl: null });
    const { notes, pageUrl } = await fetchReleaseNotes(version);
    return Response.json({ show: notes !== null, version, notes, pageUrl });
  } catch (err) {
    return storageFailure(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  if (!request.headers.get('content-type')?.includes('application/json')) return failure('unsupported-media-type', 415);
  try {
    markWhatsNewSeen(meetingStore().db, lifecycle().install.current);
    return Response.json({ ok: true });
  } catch (err) {
    return storageFailure(err);
  }
}
