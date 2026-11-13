import 'fake-indexeddb/auto';
import { expect } from 'vitest';

export const REVISION = 'main';
export const FILE = 'weights.bin';
export const CONTENT = new Uint8Array(1000).map((_, i) => i % 256);

export function treeApiResponse(size = CONTENT.length): Response {
  return new Response(JSON.stringify([{ type: 'file', path: FILE, size }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export function headResponse(size = CONTENT.length): Response {
  return new Response(null, {
    status: 200,
    headers: { 'content-length': String(size), etag: '"etag"' },
  });
}

export function streamOf(bytes: Uint8Array, chunkSize: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

export function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export async function waitUntil(cond: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !cond(); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(cond()).toBe(true);
}
