import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { folderFailure } from '@/lib/meeting-db/folders-http';
import { failure, readJson, storageFailure } from '@/lib/meeting-db/http';
import { meetingStore } from '@/lib/meeting-db/meeting-store';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 10_000;

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  try {
    return Response.json({ ok: true, folders: meetingStore().db.listFolders() });
  } catch (err) {
    return storageFailure(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const parsed = await readJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('bad-folder', 400);
  const { name, parentId } = body as { name?: unknown; parentId?: unknown };
  if (typeof name !== 'string') return failure('bad-name', 400);
  if (parentId !== undefined && parentId !== null && !isMeetingId(parentId)) return failure('bad-parent', 400);
  try {
    const folder = meetingStore().createFolder(name, (parentId as string | null | undefined) ?? null);
    return Response.json({ ok: true, folder }, { status: 201 });
  } catch (err) {
    return folderFailure(err);
  }
}
