import { describe, expect, it } from 'vitest';
import { readJson } from './http';

/** A chunked body that counts how many chunks the server pulled from it. */
function chunkedBody(chunks: string[]) {
  const state = { pulled: 0 };
  let next = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      state.pulled += 1;
      if (next >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[next]));
      next += 1;
    },
  }, { highWaterMark: 0 }); // pull only on read, so `pulled` counts what the server read
  return { stream, state };
}

const postWith = (body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers,
    body,
    duplex: 'half',
  } as RequestInit);

describe('readJson', () => {
  it('parses a chunked body within the cap', async () => {
    const { stream } = chunkedBody(['{"a":', '1}']);
    expect(await readJson(postWith(stream), 100)).toEqual({ ok: true, value: { a: 1 } });
  });

  it('answers malformed JSON with an undefined value, not a 413', async () => {
    const { stream } = chunkedBody(['{not json']);
    expect(await readJson(postWith(stream), 100)).toEqual({ ok: true, value: undefined });
  });

  it('stops reading a chunked body as soon as the cap is passed and answers 413', async () => {
    const chunk = 'x'.repeat(1000);
    const { stream, state } = chunkedBody(Array.from({ length: 10 }, () => chunk));
    const result = await readJson(postWith(stream), 2500);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    // Chunks 1-3 cross 2500 bytes: the server must not pull the other seven.
    expect(state.pulled).toBeLessThan(10);
  });

  it('refuses a declared oversize body with 413 without reading it', async () => {
    const { stream, state } = chunkedBody(['{}']);
    const result = await readJson(postWith(stream, { 'content-length': '5000' }), 100);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    expect(state.pulled).toBe(0);
  });
});
