import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import {
  CACHE_CHUNK_BYTES,
  areModelFilesCached,
  deleteModelCache,
  downloadHfFileResumable,
  ensureHfFileCached,
} from './resumable-download';
import {
  installCacheHooks,
  CHUNK_STORE,
  DB_NAME,
  FILE_STORE,
  PARTIAL_STORE,
  putRecorder,
  containsBlob,
  readStore,
  readAllKeys,
  databaseExists,
} from './resumable-download.cache-fixtures';
import {
  REVISION,
  content,
  sha256,
  stubRepo,
  bytesBehind,
} from './resumable-download.stub-repo';

installCacheHooks();

describe('the model cache never puts a Blob', () => {
  it('splits a file larger than one chunk into ArrayBuffer records, in order', async () => {
    const repo = 'test-org/multi-chunk';
    const file = 'encoder-model.onnx';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 5000);
    stubRepo(repo, file, bytes);

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(putRecorder.values.length).toBeGreaterThan(0);
    expect(putRecorder.values.filter((value) => containsBlob(value))).toEqual([]);
    const byteValues = putRecorder.values.filter((value): value is ArrayBuffer => value instanceof ArrayBuffer);
    expect(byteValues.length).toBeGreaterThanOrEqual(2);
    expect(byteValues.every((value) => value.byteLength <= CACHE_CHUNK_BYTES)).toBe(true);

    expect(await readAllKeys(CHUNK_STORE)).toEqual([`${key},0`, `${key},1`]);
    expect((await readStore<ArrayBuffer>(CHUNK_STORE, [key, 0]))?.byteLength).toBe(CACHE_CHUNK_BYTES);
    expect((await readStore<ArrayBuffer>(CHUNK_STORE, [key, 1]))?.byteLength).toBe(5000);

    expect(await readStore(FILE_STORE, key)).toMatchObject({ size: bytes.length, chunkCount: 2 });
    expect(await readStore(PARTIAL_STORE, key)).toBeUndefined();

    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('serves a whole file back from the cache, without refetching the body', async () => {
    const repo = 'test-org/cache-hit';
    const file = 'weights.bin';
    const bytes = content(CACHE_CHUNK_BYTES + 1);
    const stub = stubRepo(repo, file, bytes);
    await downloadHfFileResumable(repo, file, REVISION);
    const afterFirst = stub.calls();

    const cachedUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(stub.calls()).toBe(afterFirst);
    expect(sha256(await bytesBehind(cachedUrl))).toBe(sha256(bytes));
    expect(putRecorder.values.filter((value) => containsBlob(value))).toEqual([]);
  });

  it('resumes an interrupted download across a chunk boundary', async () => {
    const repo = 'test-org/resume-across-chunk';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 2000);
    const base = stubRepo(repo, file, bytes);
    const cutoff = CACHE_CHUNK_BYTES + 1000;

    let sent = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/api/models/') || init?.method === 'HEAD') {
          return base.fetch(input, init);
        }
        return new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (sent >= cutoff) {
                controller.error(new Error('simulated: connection dropped (page refreshed)'));
                return;
              }
              const end = Math.min(cutoff, sent + 256 * 1024);
              controller.enqueue(bytes.subarray(sent, end));
              sent = end;
            },
          }),
          { status: 200, headers: { etag: `"${file}-etag"` } },
        );
      }),
    );
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    expect(await readStore(PARTIAL_STORE, key)).toMatchObject({
      totalBytes: bytes.length,
      sealedChunks: 1,
    });
    expect(putRecorder.values.filter((value) => containsBlob(value))).toEqual([]);

    const second = stubRepo(repo, file, bytes);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);
    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    expect(await readStore(FILE_STORE, key)).toMatchObject({ size: bytes.length, chunkCount: 2 });
    expect(putRecorder.values.filter((value) => containsBlob(value))).toEqual([]);
  });

  it('frees the bytes on "Delete downloaded models"', async () => {
    const repo = 'test-org/delete-me';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 10);
    stubRepo(repo, file, bytes);
    await ensureHfFileCached(repo, file, REVISION);
    expect(await readAllKeys(CHUNK_STORE)).toEqual([`${key},0`, `${key},1`]);

    expect(await deleteModelCache()).toEqual({ deleted: true });

    expect(await databaseExists(DB_NAME)).toBe(false);
    const { cached } = await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);
    expect(cached).toBe(0);
  });
});
