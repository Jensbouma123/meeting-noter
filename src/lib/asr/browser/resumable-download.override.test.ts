import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  areModelFilesCached,
  deleteModelCache,
  downloadHfFileResumable,
} from './resumable-download';

/**
 * Per-file URL overrides (`fileUrlOverrides` in `model-manifest.ts`) — for
 * manifest files no public repo ships, like the self-built fp16 encoder.
 *
 * The contract: the bytes come from the override origin, while everything
 * else (cache key, resume, validation, probing) behaves exactly as for a
 * hosted file. In particular the downloader must never touch the
 * Hugging Face resolve URL for an overridden file — that URL 404s by
 * construction (the file is what is missing upstream).
 */

const REPO = 'test/url-override-repo';
const FILE = 'encoder-model.fp16.onnx';
const OVERRIDE_URL = '/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.fp16.onnx';

function content(length: number): Uint8Array<ArrayBuffer> {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8)) % 251;
  return bytes;
}

describe('urlOverride', () => {
  // Small on purpose: fake-indexeddb structured-clones every chunk, so
  // megabytes here are seconds of test time. One partial-chunk file still
  // exercises fetch → cache → blob-URL end to end.
  const bytes = content(513 * 1024 + 17);
  let requestedUrls: string[];
  let requestedMethods: Array<string | undefined>;

  beforeEach(async () => {
    await deleteModelCache();
    requestedUrls = [];
    requestedMethods = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        requestedUrls.push(url);
        requestedMethods.push(init?.method);
        if (url.includes('/api/models/')) {
          // The upstream tree does NOT list the file — it is self-hosted.
          return new Response(JSON.stringify([{ type: 'file', path: 'vocab.txt', size: 9 }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        if (init?.method === 'HEAD') {
          return new Response(null, {
            status: 200,
            headers: { 'content-length': String(bytes.length), etag: '"override-etag"' },
          });
        }
        const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
        const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
        return new Response(bytes.subarray(start), {
          status: range ? 206 : 200,
          headers: { 'content-length': String(bytes.length - start), etag: '"override-etag"' },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches an overridden file from the override URL, never from Hugging Face', async () => {
    const url = await downloadHfFileResumable(REPO, FILE, 'main', { urlOverride: OVERRIDE_URL });

    const bodyFetches = requestedUrls.filter((u) => !u.includes('/api/models/'));
    expect(bodyFetches.length).toBeGreaterThan(0);
    for (const u of bodyFetches) {
      expect(u, 'every byte request must go to the override origin').toBe(OVERRIDE_URL);
    }
    expect(
      requestedUrls.some((u) => u.includes('huggingface.co') && u.includes(FILE)),
      'the HF resolve URL for an overridden file must never be fetched',
    ).toBe(false);

    const res = await fetch(url);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it('caches the overridden file under the manifest identity, so the second load is a cache hit', async () => {
    await downloadHfFileResumable(REPO, FILE, 'main', { urlOverride: OVERRIDE_URL });
    const state = await areModelFilesCached({ modelRepo: REPO, files: [FILE] });
    expect(state.complete).toBe(true);

    const callsBefore = requestedUrls.length;
    await downloadHfFileResumable(REPO, FILE, 'main', { urlOverride: OVERRIDE_URL });
    const bodyFetchesAfter = requestedUrls
      .slice(callsBefore)
      .filter((u, i) => !u.includes('/api/models/') && requestedMethods[callsBefore + i] !== 'HEAD');
    expect(bodyFetchesAfter, 'a cached override file must not fetch its body again').toEqual([]);
  });
});
