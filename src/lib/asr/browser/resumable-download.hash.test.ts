import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CACHE_CHUNK_BYTES, downloadHfFileResumable } from './resumable-download';
import {
  installHashHooks,
  REVISION,
  content,
  sha256,
  bytesBehind,
  stubRepo,
} from './resumable-download.hash-fixtures';

installHashHooks();

describe('verifying a file against its checksum', () => {
  it('covers every byte of a file whose size is not a whole number of chunks', async () => {
    const repo = 'test-org/tail-in-the-digest';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 5000);
    stubRepo(repo, file, bytes, sha256(bytes));

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('covers every byte of a file that is many chunks long, tail and all', async () => {
    const repo = 'test-org/many-chunks';
    const file = 'encoder-model.onnx.data';
    const bytes = content(CACHE_CHUNK_BYTES * 3 + 12345);
    stubRepo(repo, file, bytes, sha256(bytes));

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('covers a file assembled from a stored prefix, a resumed range and a fresh tail', async () => {
    const repo = 'test-org/resumed-hash';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 7);
    const digest = sha256(bytes);

    stubRepo(repo, file, bytes, digest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    const second = stubRepo(repo, file, bytes, digest);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('refuses a file whose bytes do not match, and caches nothing', async () => {
    const repo = 'test-org/genuine-mismatch';
    const file = 'weights.bin';
    const bytes = content(1024);
    stubRepo(repo, file, bytes, 'f'.repeat(64));

    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow(/checksum mismatch/);

    const { areModelFilesCached } = await import('./resumable-download');
    expect(await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION)).toEqual({
      cached: 0,
      total: 1,
      complete: false,
    });
  });
});
