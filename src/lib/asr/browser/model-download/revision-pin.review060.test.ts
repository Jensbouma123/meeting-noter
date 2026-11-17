import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteModelCache, downloadHfFileResumable, areModelFilesCached } from '../resumable-download';
import { installCacheHooks, readAllKeys } from '../resumable-download.cache-fixtures';
import { cacheKey } from './cached-files';
import { getMetaRecord, putMetaRecord } from './cache-primitives';
import { FILE_STORE } from './constants';
import { resolveCacheKey } from './revision-pin';

installCacheHooks();

const REPO = 'test/review060-repo';
const FILE = 'encoder-model.q4f16.onnx';
const REVISION = 'main';
const URL_OVERRIDE = '/models/webgpu/encoder-model.q4f16.onnx';
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const BASE_KEY = cacheKey(REPO, REVISION, FILE);
const POINTER_KEY = `revision-pin--${BASE_KEY}`;
const pinnedKey = (sha: string) => cacheKey(REPO, `${REVISION}-sha-${sha.slice(0, 16)}`, FILE);
const manifest = { modelRepo: REPO, files: [FILE], fileUrlOverrides: { [FILE]: URL_OVERRIDE } };
const load = () => downloadHfFileResumable(REPO, FILE, REVISION, { urlOverride: URL_OVERRIDE });
const hfKeys = async () => (await readAllKeys(FILE_STORE)).filter((k) => k.startsWith('hf-'));

interface Server {
  sha: string | null;
  sidecarBody?: string;
  sidecarStatus: number;
  sidecarHangs: boolean;
  offline: boolean;
  body: Uint8Array<ArrayBuffer>;
  bodyStatus: number;
  bodyFetches: number;
  sidecarFetches: number;
}

function serve(server: Server): void {
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

function bytesOf(fill: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(4096).fill(fill);
}

function freshServer(overrides: Partial<Server> = {}): Server {
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

async function firstByte(url: string): Promise<number> {
  return new Uint8Array(await (await fetch(url)).arrayBuffer())[0];
}

describe('encoder cache key derived from the .sha256 sidecar', () => {
  let server: Server;

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keys the cached record by the first 16 hex digits of the sidecar sha', async () => {
    server = freshServer();
    serve(server);
    await load();
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
  });

  it('accepts an upper-case sidecar sha followed by a file name and keys it in lower case', async () => {
    server = freshServer({ sha: 'A'.repeat(64) });
    serve(server);
    expect(await resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE)).toBe(pinnedKey(SHA_A));
  });

  it('falls back to the unpinned key when the sidecar body is not a sha', async () => {
    server = freshServer({ sidecarBody: '<!doctype html><html></html>' });
    serve(server);
    expect(await resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE)).toBe(BASE_KEY);
    await load();
    expect(await hfKeys()).toEqual([BASE_KEY]);
  });

  it('does not ask for a sidecar when the file has no url override', async () => {
    server = freshServer();
    serve(server);
    expect(await resolveCacheKey(REPO, REVISION, FILE, undefined)).toBe(BASE_KEY);
    expect(server.sidecarFetches).toBe(0);
  });

  it('treats a sidecar that never answers as offline once the 3 s deadline passes', async () => {
    server = freshServer();
    serve(server);
    await load();
    server.sidecarHangs = true;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const pending = resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await pending).toBe(pinnedKey(SHA_A));
  });
});

describe('stale record removal when the sha changes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('replaces the pinned record and writes a pointer to the new sha', async () => {
    const server = freshServer();
    serve(server);
    await load();
    server.sha = SHA_B;
    server.body = bytesOf(2);
    expect(await firstByte(await load())).toBe(2);

    expect(await hfKeys()).toEqual([pinnedKey(SHA_B)]);
    expect((await getMetaRecord<{ sha: string }>(FILE_STORE, POINTER_KEY))?.sha).toBe(SHA_B);
    expect((await areModelFilesCached(manifest)).complete).toBe(true);
  });

  // BUG (suspected): the old pinned record is deleted before the new body is fetched.
  // If the new download then fails, the old model is gone and the pointer already names the
  // new sha, so an offline start cannot use anything.
  it('keeps the old model usable offline when the download of the new sha fails', async () => {
    const server = freshServer();
    serve(server);
    await load();
    server.sha = SHA_B;
    server.body = bytesOf(2);
    server.bodyStatus = 500;
    await expect(load()).rejects.toThrow();

    server.bodyStatus = 200;
    server.offline = true;
    const fetchesBefore = server.bodyFetches;
    expect(await firstByte(await load())).toBe(1);
    expect(server.bodyFetches).toBe(fetchesBefore);
  });
});

describe('corrupt and partial records', () => {
  afterEach(() => vi.unstubAllGlobals());

  // BUG (suspected): a pointer record without a usable sha makes resolveCacheKey throw
  // (`pinnedRevision` calls `.slice` on undefined), so every later start fails, offline too.
  it('does not break the model load when the pointer record has no sha', async () => {
    const server = freshServer();
    serve(server);
    await putMetaRecord(FILE_STORE, POINTER_KEY, { updatedAt: 1 });
    expect(await firstByte(await load())).toBe(1);
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
  });

  it('discards a pinned record whose size no longer matches and downloads it again', async () => {
    const server = freshServer();
    serve(server);
    await load();
    await putMetaRecord(FILE_STORE, pinnedKey(SHA_A), { size: 999_999, chunkCount: 1, updatedAt: 1 });
    expect(await firstByte(await load())).toBe(1);
    expect(server.bodyFetches).toBe(2);
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
  });
});

describe('sidecar fetch failures', () => {
  afterEach(() => vi.unstubAllGlobals());

  // BUG (suspected): a 5xx sidecar is classed as "missing" rather than "offline", so the
  // pinned copy on disk is ignored and the whole model is downloaded again.
  it('keeps using the pinned copy when the sidecar answers 503', async () => {
    const server = freshServer();
    serve(server);
    await load();
    server.sidecarStatus = 503;
    await load();
    expect(server.bodyFetches).toBe(1);
  });

  it('keeps using the pinned copy when the sidecar request fails at the network level', async () => {
    const server = freshServer();
    serve(server);
    await load();
    server.offline = true;
    expect(await firstByte(await load())).toBe(1);
    expect(server.bodyFetches).toBe(1);
  });
});

describe('upgrade from 0.5.1 (unpinned key format)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('serves a 0.5.1 record offline without any network request for the body', async () => {
    const server = freshServer({ sha: null });
    serve(server);
    await load();
    expect(await hfKeys()).toEqual([BASE_KEY]);

    server.offline = true;
    expect(await firstByte(await load())).toBe(1);
    expect(server.bodyFetches).toBe(1);
  });

  it('replaces the 0.5.1 record with one pinned record on the first online start', async () => {
    const server = freshServer({ sha: null });
    serve(server);
    await load();
    server.sha = SHA_A;
    await load();
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
    expect(await getMetaRecord(FILE_STORE, BASE_KEY)).toBeUndefined();
  });
});

describe('concurrent calls', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('two overlapping loads of the same new sha share one body download', async () => {
    const server = freshServer();
    serve(server);
    const [a, b] = await Promise.all([load(), load()]);
    expect(await firstByte(a)).toBe(1);
    expect(await firstByte(b)).toBe(1);
    expect(server.bodyFetches).toBe(1);
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
  });

  it('three overlapping resolutions of a changed sha settle on one key and one pointer', async () => {
    const server = freshServer();
    serve(server);
    await load();
    server.sha = SHA_B;
    const keys = await Promise.all([
      resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE),
      resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE),
      resolveCacheKey(REPO, REVISION, FILE, URL_OVERRIDE),
    ]);
    expect(new Set(keys)).toEqual(new Set([pinnedKey(SHA_B)]));
    expect((await getMetaRecord<{ sha: string }>(FILE_STORE, POINTER_KEY))?.sha).toBe(SHA_B);
  });
});

describe('offline with nothing cached', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects instead of reporting a model that was never downloaded', async () => {
    const server = freshServer({ offline: true });
    serve(server);
    await expect(load()).rejects.toThrow();
    expect(server.bodyFetches).toBe(0);
    expect(await hfKeys()).toEqual([]);
  });
});
