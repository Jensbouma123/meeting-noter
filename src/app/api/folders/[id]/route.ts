/**
 * `/api/folders/:id`. `PATCH {name?, parentId?}` renames and/or moves the
 * folder (`parentId: null` is the root): 404 `not-found`, 400 `bad-name` /
 * `bad-parent`, 409 `cycle`. `DELETE ?mode=move-up|delete-contents` (default
 * `move-up`) removes it: its subfolders and meetings go to its parent, or
 * everything below it is deleted for good, Markdown files included.
 */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { folderFailure } from '@/lib/meeting-db/folders-http';
import { failure, readJson } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/store';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  const body = await readJson(request, 10_000);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('bad-folder', 400);
  const { name, parentId } = body as { name?: unknown; parentId?: unknown };
  if (name === undefined && parentId === undefined) return failure('bad-folder', 400);
  if (name !== undefined && typeof name !== 'string') return failure('bad-name', 400);
  if (parentId !== undefined && parentId !== null && !isMeetingId(parentId)) return failure('bad-parent', 400);
  try {
    const { db } = meetingStore();
    let folder = db.listFolders().find((f) => f.id === id);
    if (!folder) return failure('not-found', 404);
    if (name !== undefined) folder = db.renameFolder(id, name as string);
    if (parentId !== undefined) folder = db.moveFolder(id, parentId as string | null);
    return Response.json({ ok: true, folder });
  } catch (err) {
    return folderFailure(err);
  }
}

export async function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  const mode = new URL(request.url).searchParams.get('mode') ?? 'move-up';
  if (mode !== 'move-up' && mode !== 'delete-contents') return failure('bad-mode', 400);
  try {
    return Response.json({ ok: true, deleted: meetingStore().deleteFolder(id, mode) });
  } catch (err) {
    return folderFailure(err);
  }
}
