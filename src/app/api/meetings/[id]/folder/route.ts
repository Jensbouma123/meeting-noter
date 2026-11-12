/**
 * `PUT /api/meetings/:id/folder` with `{folderId: string | null}` files the
 * meeting in a folder (null: unfiled). 404 `not-found` (meeting), 400
 * `bad-parent` (no such folder). Bumps the meeting's `updatedAt` so browsers pull it.
 */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { folderFailure } from '@/lib/meeting-db/folders-http';
import { failure, readJson } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/store';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  const body = await readJson(request, 10_000);
  const folderId = body && typeof body === 'object' ? (body as { folderId?: unknown }).folderId : undefined;
  if (folderId !== null && !isMeetingId(folderId)) return failure('bad-parent', 400);
  try {
    meetingStore().db.moveMeeting(id, folderId);
    return Response.json({ ok: true });
  } catch (err) {
    return folderFailure(err);
  }
}
