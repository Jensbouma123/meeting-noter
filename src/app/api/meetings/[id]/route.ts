import type { IdRouteContext } from '@/app/api/types';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { MAX_MEETING_BODY_BYTES, failure, readJson, storageFailure } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/store';
import { isMeetingId, parseStoredMeeting } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  try {
    const meeting = meetingStore().db.get(id);
    return meeting ? Response.json({ ok: true, meeting }) : failure('not-found', 404);
  } catch (err) {
    return storageFailure(err);
  }
}

export async function PUT(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  const parsed = await readJson(request, MAX_MEETING_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const meeting = parseStoredMeeting(parsed.value);
  if (!meeting || meeting.id !== id) return failure('bad-meeting', 400);
  try {
    const store = meetingStore();
    const result = store.save(meeting);
    if (result === 'stale') {
      return Response.json({ ok: false, error: 'stale', meeting: store.db.get(id) }, { status: 409 });
    }
    if (result === 'deleted') return failure('deleted', 410);
    return Response.json({ ok: true });
  } catch (err) {
    return storageFailure(err);
  }
}

export async function DELETE(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  try {
    return Response.json({ ok: true, deleted: meetingStore().delete(id) });
  } catch (err) {
    return storageFailure(err);
  }
}
