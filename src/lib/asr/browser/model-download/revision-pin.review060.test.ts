import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCacheKey } from './revision-pin';
import { installCacheHooks } from '../resumable-download.cache-fixtures';
import * as S from './revision-pin.review060.support';
import type { Server } from './revision-pin.review060.types';
const { REPO, FILE, REVISION, URL_OVERRIDE, SHA_A, BASE_KEY, pinnedKey, load, hfKeys, serve, freshServer } = S;

installCacheHooks();

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
