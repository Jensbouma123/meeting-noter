/** Shared bits of the /api/meetings routes. */

/** A 10-hour transcript is a few MB of JSON; the import carries every meeting at once. */
export const MAX_MEETING_BODY_BYTES = 20_000_000;
export const MAX_IMPORT_BODY_BYTES = 200_000_000;

/** The request body as JSON, or undefined when it is too large or not JSON. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) return undefined;
  const text = await request.text().catch(() => '');
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function failure(error: string, status: number): Response {
  return Response.json({ ok: false, error }, { status });
}

/** The DB could not be opened or written (disk full, permissions, Node without node:sqlite). */
export function storageFailure(err: unknown): Response {
  console.error('[meetings] storage error', err);
  return failure('storage-unavailable', 503);
}
