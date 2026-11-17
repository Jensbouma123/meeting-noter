import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { areModelFilesCached, deleteModelCache, downloadHfFileResumable } from './resumable-download';
import type { PinTestServer as Server } from './types/pin-test-server';
import { FILE_STORE, installCacheHooks, readAllKeys } from './resumable-download.cache-fixtures';

installCacheHooks();

const REPO = 'test/pin-repo';
const FILE = 'encoder-model.q4f16.onnx';
const URL_OVERRIDE = '/models/webgpu/encoder-model.q4f16.onnx';
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function serve(server: Server): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (server.offline) throw new TypeError('offline');
      if (url.includes('/api/models/')) return new Response('[]', { status: 200 });
      if (url.endsWith('.sha256')) {
        return server.sha ? new Response(`${server.sha}\n`) : new Response('no', { status: 404 });
      }
      if (init?.method === 'HEAD') {
        return new Response(null, { headers: { 'content-length': String(server.body.length) } });
      }
      server.bodyFetches += 1;
      return new Response(server.body, { headers: { 'content-length': String(server.body.length) } });
    }),
  );
}

function bytesOf(fill: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(4096).fill(fill);
}

const manifest = { modelRepo: REPO, files: [FILE], fileUrlOverrides: { [FILE]: URL_OVERRIDE } };
const load = () => downloadHfFileResumable(REPO, FILE, 'main', { urlOverride: URL_OVERRIDE });
const fileKeys = async () => (await readAllKeys(FILE_STORE)).filter((k) => k.startsWith('hf-'));

describe('revision pin from the .sha256 sidecar', () => {
  let server: Server;

  beforeEach(async () => {
    await deleteModelCache();
    server = { sha: SHA_A, offline: false, body: bytesOf(1), bodyFetches: 0 };
    serve(server);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('re-downloads a same-size model with a new sha and removes the old record', async () => {
    await load();
    const [oldKey] = await fileKeys();
    server.sha = SHA_B;
    server.body = bytesOf(2);
    const url = await load();

    expect(server.bodyFetches).toBe(2);
    expect(new Uint8Array(await (await fetch(url)).arrayBuffer())[0]).toBe(2);
    const keys = await fileKeys();
    expect(keys).toHaveLength(1);
    expect(keys).not.toContain(oldKey);
  });

  it('reuses the cached model while the sha is unchanged', async () => {
    await load();
    await load();
    expect(server.bodyFetches).toBe(1);
    expect((await areModelFilesCached(manifest)).complete).toBe(true);
  });

  it('keeps the old key when the sha file is missing', async () => {
    server.sha = null;
    await load();
    expect(await fileKeys()).toEqual([`hf-${REPO}-main--${FILE}`]);
    await load();
    expect(server.bodyFetches).toBe(1);
  });

  it('uses the cached model offline', async () => {
    await load();
    server.offline = true;
    const url = await load();
    server.offline = false;
    expect(server.bodyFetches).toBe(1);
    expect(new Uint8Array(await (await fetch(url)).arrayBuffer())[0]).toBe(1);
    server.offline = true;
    expect((await areModelFilesCached(manifest)).complete).toBe(true);
  });
});
