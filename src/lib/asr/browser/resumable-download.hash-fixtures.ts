import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, vi } from 'vitest';
import type { RepoStub } from './resumable-download.hash-fixtures.types';
import { deleteModelCache } from './resumable-download';

export const REVISION = 'main';

export function content(length: number, seed = 0): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8) + seed) % 251;
  return bytes;
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function bytesBehind(blobUrl: string): Promise<Uint8Array> {
  const response = await fetch(blobUrl);
  return new Uint8Array(await response.arrayBuffer());
}

export function stubRepo(
  repo: string,
  file: string,
  bytes: Uint8Array,
  treeSha: string,
  options: { dropAfterBytes?: number; sliceBytes?: number } = {},
): RepoStub {
  const { dropAfterBytes, sliceBytes = 256 * 1024 } = options;
  const ranges: Array<string | null> = [];
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
    if (url.includes('/api/models/')) {
      return new Response(
        JSON.stringify([{ type: 'file', path: file, size: bytes.length, lfs: { oid: treeSha } }]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(bytes.length), 'x-linked-etag': `"${treeSha}"` },
      });
    }
    ranges.push(range);
    const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
    const end = dropAfterBytes ?? bytes.length;
    let sent = start;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= end) {
          if (dropAfterBytes !== undefined && end < bytes.length) {
            controller.error(new Error('simulated: connection dropped (page refreshed)'));
            return;
          }
          controller.close();
          return;
        }
        const next = Math.min(end, sent + sliceBytes);
        controller.enqueue(bytes.subarray(sent, next));
        sent = next;
      },
    });
    return new Response(body, {
      status: range ? 206 : 200,
      headers: { 'content-length': String(bytes.length - start), 'x-linked-etag': `"${treeSha}"` },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fetch: fn as unknown as RepoStub['fetch'], ranges: () => ranges };
}
export function corruptStoredChunk(key: string, index: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('mn-model-cache-db');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const read = db.transaction('chunks', 'readonly').objectStore('chunks').get([key, index]);
      read.onsuccess = () => {
        const original = new Uint8Array(read.result as ArrayBuffer);
        original[0] = original[0] ^ 0xff;
        const tx = db.transaction('chunks', 'readwrite');
        tx.objectStore('chunks').put(original.buffer, [key, index] as IDBValidKey);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      read.onerror = () => reject(read.error);
    };
  });
}


export function installHashHooks(): void {
  beforeEach(async () => {
    await deleteModelCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}
