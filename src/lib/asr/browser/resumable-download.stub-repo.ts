import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import type { DownloadStub, FetchMock } from './resumable-download.stub-repo.types';

export const REVISION = 'main';

export function content(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8) + (i % 7)) % 251;
  return bytes;
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}


export function stubRepo(repo: string, file: string, bytes: Uint8Array, sliceBytes = 256 * 1024): DownloadStub {
  const ranges: Array<string | null> = [];
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
    if (url.includes('/api/models/')) {
      return new Response(JSON.stringify([{ type: 'file', path: file, size: bytes.length }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(bytes.length), etag: `"${file}-etag"` },
      });
    }
    ranges.push(range);
    const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
    let sent = start;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= bytes.length) {
          controller.close();
          return;
        }
        const end = Math.min(bytes.length, sent + sliceBytes);
        controller.enqueue(bytes.subarray(sent, end));
        sent = end;
      },
    });
    return new Response(body, {
      status: range ? 206 : 200,
      headers: { 'content-length': String(bytes.length - start), etag: `"${file}-etag"` },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fetch: fn as unknown as FetchMock, calls: () => fn.mock.calls.length, ranges: () => ranges };
}


export async function bytesBehind(blobUrl: string): Promise<Uint8Array> {
  const response = await fetch(blobUrl);
  return new Uint8Array(await response.arrayBuffer());
}


