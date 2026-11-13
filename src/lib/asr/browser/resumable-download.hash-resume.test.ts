import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { CACHE_CHUNK_BYTES, downloadHfFileResumable } from './resumable-download';
import {
  installHashHooks,
  REVISION,
  content,
  sha256,
  bytesBehind,
  stubRepo,
  corruptStoredChunk,
} from './resumable-download.hash-fixtures';

installHashHooks();

describe('a resumed file that does not verify', () => {
  it('discards the partial and takes the whole file again, once', async () => {
    const repo = 'test-org/resume-mismatch';
    const file = 'encoder-model.onnx';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 3);
    const digest = sha256(bytes);

    stubRepo(repo, file, bytes, digest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    await corruptStoredChunk(key, 0);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const second = stubRepo(repo, file, bytes, digest);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`, null]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(/did not match its checksum/i);
  });

  it('fails after exactly one retry, rather than looping', async () => {
    const repo = 'test-org/resume-mismatch-twice';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 5);
    const wrongDigest = 'b'.repeat(64);

    stubRepo(repo, file, bytes, wrongDigest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const second = stubRepo(repo, file, bytes, wrongDigest);
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow(/checksum mismatch/);

    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`, null]);
  });
});
