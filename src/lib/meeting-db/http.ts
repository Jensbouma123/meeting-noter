import type { JsonBody } from './types';

export const MAX_MEETING_BODY_BYTES = 20_000_000;
export const MAX_IMPORT_BODY_BYTES = 200_000_000;

export function failure(error: string, status: number): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function readJson(request: Request, maxBytes: number): Promise<JsonBody> {
  const tooLarge = { ok: false as const, response: failure('body-too-large', 413) };
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return tooLarge;
  const bytes = await readCapped(request, maxBytes);
  if (bytes === null) return tooLarge;
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: true, value: undefined };
  }
}

async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return new Uint8Array();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function storageFailure(err: unknown): Response {
  console.error('[meetings] storage error', err);
  return failure('storage-unavailable', 503);
}
