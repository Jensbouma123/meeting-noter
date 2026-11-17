import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import type { Server } from './revision-pin.review060.types';
import { downloadHfFileResumable } from '../resumable-download';
import { readAllKeys } from '../resumable-download.cache-fixtures';
import { cacheKey } from './cached-files';
import { FILE_STORE } from './constants';


export const REPO = 'test/review060-repo';
export const FILE = 'encoder-model.q4f16.onnx';
export const REVISION = 'main';
export const URL_OVERRIDE = '/models/webgpu/encoder-model.q4f16.onnx';
export const SHA_A = 'a'.repeat(64);
export const SHA_B = 'b'.repeat(64);
export const BASE_KEY = cacheKey(REPO, REVISION, FILE);
export const POINTER_KEY = `revision-pin--${BASE_KEY}`;
export const pinnedKey = (sha: string) => cacheKey(REPO, `${REVISION}-sha-${sha.slice(0, 16)}`, FILE);
export const manifest = { modelRepo: REPO, files: [FILE], fileUrlOverrides: { [FILE]: URL_OVERRIDE } };
export const load = () => downloadHfFileResumable(REPO, FILE, REVISION, { urlOverride: URL_OVERRIDE });
export const realFetch = globalThis.fetch;
export const hfKeys = async () => (await readAllKeys(FILE_STORE)).filter((k) => k.startsWith('hf-'));

export function serve(server: Server): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (server.offline) return Promise.reject(new TypeError('offline'));
      if (url.includes('/api/models/')) return Promise.resolve(new Response('[]', { status: 200 }));
      if (url.endsWith('.sha256')) {
        server.sidecarFetches += 1;
        if (server.sidecarHangs) {
          return new Promise<Response>((_, reject) =>
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          );
        }
        if (server.sha === null) return Promise.resolve(new Response('no', { status: 404 }));
        const text = server.sidecarBody ?? `${server.sha}  ${FILE}\n`;
        return Promise.resolve(new Response(text, { status: server.sidecarStatus }));
      }
      if (init?.method === 'HEAD') {
        return Promise.resolve(
          new Response(null, { headers: { 'content-length': String(server.body.length) } }),
        );
      }
      server.bodyFetches += 1;
      if (server.bodyStatus !== 200) return Promise.resolve(new Response('boom', { status: server.bodyStatus }));
      return Promise.resolve(
        new Response(server.body, { headers: { 'content-length': String(server.body.length) } }),
      );
    }),
  );
}

export function bytesOf(fill: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(4096).fill(fill);
}

export function freshServer(overrides: Partial<Server> = {}): Server {
  return {
    sha: SHA_A,
    sidecarStatus: 200,
    sidecarHangs: false,
    offline: false,
    body: bytesOf(1),
    bodyStatus: 200,
    bodyFetches: 0,
    sidecarFetches: 0,
    ...overrides,
  };
}

export async function firstByte(url: string): Promise<number> {
  return new Uint8Array(await (await realFetch(url)).arrayBuffer())[0];
}
