import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { areModelFilesCached } from '../resumable-download';
import { getMetaRecord, putMetaRecord } from './cache-primitives';
import { FILE_STORE } from './constants';
import { installCacheHooks } from '../resumable-download.cache-fixtures';
import * as S from './revision-pin.review060.support';
const { SHA_A, SHA_B, POINTER_KEY, pinnedKey, manifest, load, hfKeys, serve, freshServer, bytesOf, firstByte } = S;

installCacheHooks();

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
