import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import {
  areModelFilesCached,
  downloadHfFileResumable,
  ensureHfFileCached,
} from './resumable-download';
import {
  installCacheHooks,
  FILE_STORE,
  refuseByteWrites,
  readStore,
} from './resumable-download.cache-fixtures';
import {
  REVISION,
  content,
  sha256,
  stubRepo,
  bytesBehind,
} from './resumable-download.stub-repo';

installCacheHooks();

describe('a cache that refuses the bytes', () => {
  it('still hands the caller its file, logs it, and says it will re-download', async () => {
    const repo = 'test-org/refused-partial';
    const file = 'weights.bin';
    const bytes = content(4096);
    stubRepo(repo, file, bytes);
    refuseByteWrites('Error preparing Blob/File data to be stored in object store');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings: string[] = [];

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION, {
      onCacheWarning: (message) => warnings.push(message),
    });

    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    expect(errors).toHaveBeenCalled();
    expect(String(errors.mock.calls[0][0])).toMatch(/could not write/i);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/downloaded again the next time/i);
  });

  it('leaves no record claiming a file the cache never took', async () => {
    const repo = 'test-org/refused-warm';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(2048);
    stubRepo(repo, file, bytes);
    refuseByteWrites('quota exceeded');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings: string[] = [];

    await expect(
      ensureHfFileCached(repo, file, REVISION, {
        onCacheWarning: (message) => warnings.push(message),
      }),
    ).resolves.toBeUndefined();

    expect(warnings[0]).toMatch(/downloaded again the next time/i);
    expect(await readStore(FILE_STORE, key)).toBeUndefined();
    expect(await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION)).toEqual({
      cached: 0,
      total: 1,
      complete: false,
    });
  });
});
