import type { IdRouteContext } from '@/app/api/types';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { folderFailure } from '@/lib/meeting-db/folders-http';
import { failure, readJson } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/store';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  const parsed = await readJson(request, 10_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const folderId = body && typeof body === 'object' ? (body as { folderId?: unknown }).folderId : undefined;
  if (folderId !== null && !isMeetingId(folderId)) return failure('bad-parent', 400);
  try {
    meetingStore().moveMeeting(id, folderId);
    return Response.json({ ok: true });
  } catch (err) {
    return folderFailure(err);
  }
}
