import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMetaRecord } from './cache-primitives';
import { FILE_STORE } from './constants';
import { resolveCacheKey } from './revision-pin';
import { installCacheHooks } from '../resumable-download.cache-fixtures';
import * as S from './revision-pin.review060.support';
const {
  REPO,
  FILE,
  REVISION,
  URL_OVERRIDE,
  SHA_A,
  SHA_B,
  BASE_KEY,
  POINTER_KEY,
  pinnedKey,
  load,
  hfKeys,
  serve,
  freshServer,
  firstByte,
} = S;

installCacheHooks();

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

  it('three overlapping resolutions of a changed sha settle on one key and keep the old pointer until the download finishes', async () => {
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
    expect((await getMetaRecord<{ sha: string }>(FILE_STORE, POINTER_KEY))?.sha).toBe(SHA_A);
    expect(await hfKeys()).toEqual([pinnedKey(SHA_A)]);
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
