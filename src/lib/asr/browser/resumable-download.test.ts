import { describe, expect, it } from 'vitest';
import {
  CACHE_CHUNK_BYTES,
  categorizeManifestFile,
  chunkCountFor,
  decideResume,
  isSizeValid,
  planChunkRanges,
  shouldVerifyHash,
} from './resumable-download';
import { PARAKEET_TDT_V3 } from './model-manifest';

describe('decideResume', () => {
  it('restarts when there is no partial on record', () => {
    expect(decideResume(null, { totalBytes: 1000, etag: 'a' })).toBe('restart');
  });

  it('resumes when the partial matches the fresh metadata', () => {
    const partial = { loadedBytes: 400, totalBytes: 1000, etag: 'a' };
    expect(decideResume(partial, { totalBytes: 1000, etag: 'a' })).toBe('resume');
  });

  it('resumes when neither side has an ETag, as long as size matches', () => {
    const partial = { loadedBytes: 400, totalBytes: 1000, etag: null };
    expect(decideResume(partial, { totalBytes: 1000, etag: null })).toBe('resume');
  });

  it('restarts when the remote file size changed (file replaced upstream)', () => {
    const partial = { loadedBytes: 400, totalBytes: 1000, etag: 'a' };
    expect(decideResume(partial, { totalBytes: 2000, etag: 'a' })).toBe('restart');
  });

  it('restarts when the ETag changed (file replaced upstream, same size)', () => {
    const partial = { loadedBytes: 400, totalBytes: 1000, etag: 'a' };
    expect(decideResume(partial, { totalBytes: 1000, etag: 'b' })).toBe('restart');
  });

  it('restarts a partial that already claims the full size (corrupt bookkeeping)', () => {
    const partial = { loadedBytes: 1000, totalBytes: 1000, etag: 'a' };
    expect(decideResume(partial, { totalBytes: 1000, etag: 'a' })).toBe('restart');
  });

  it('restarts a partial with zero or negative bytes recorded', () => {
    const partial = { loadedBytes: 0, totalBytes: 1000, etag: 'a' };
    expect(decideResume(partial, { totalBytes: 1000, etag: 'a' })).toBe('restart');
  });
});

describe('isSizeValid', () => {
  it('accepts an exact match', () => {
    expect(isSizeValid(1000, 1000)).toBe(true);
  });

  it('rejects a short (half-written) file', () => {
    expect(isSizeValid(500, 1000)).toBe(false);
  });

  it('rejects a file larger than expected', () => {
    expect(isSizeValid(1500, 1000)).toBe(false);
  });

  it('rejects NaN/Infinity', () => {
    expect(isSizeValid(NaN, 1000)).toBe(false);
    expect(isSizeValid(Infinity, 1000)).toBe(false);
  });
});

describe('shouldVerifyHash', () => {
  it('verifies small files', () => {
    expect(shouldVerifyHash(1024)).toBe(true);
  });

  it('skips hashing above the size threshold (2.4 GB encoder data)', () => {
    expect(shouldVerifyHash(2_435_420_160)).toBe(false);
  });

  it('skips a zero-size file', () => {
    expect(shouldVerifyHash(0)).toBe(false);
  });
});

describe('chunk arithmetic', () => {
  // Pure, and the thing the whole storage format is built on: a file is a
  // sequence of fixed-size records plus a short last one, and the two helpers
  // that describe that sequence have to agree about it exactly. Where they
  // did not, the digest covered a file minus its tail — see
  // `resumable-download.hash.test.ts`.
  it('puts an exact multiple of the chunk size in whole chunks, with no empty one after it', () => {
    expect(planChunkRanges(600, 200)).toEqual([
      { index: 0, start: 0, end: 200 },
      { index: 1, start: 200, end: 400 },
      { index: 2, start: 400, end: 600 },
    ]);
    expect(chunkCountFor(600, 200)).toBe(3);
  });

  it('leaves one short chunk when the file is not a whole number of them', () => {
    // The shape of the real failure: 41,770,866 bytes is not a whole number of
    // 16 MiB chunks, and the short last chunk is the one that has to be counted
    // everywhere — in the record, in the digest, and in the blob handed to ORT.
    expect(planChunkRanges(450, 200)).toEqual([
      { index: 0, start: 0, end: 200 },
      { index: 1, start: 200, end: 400 },
      { index: 2, start: 400, end: 450 },
    ]);
    expect(chunkCountFor(450, 200)).toBe(3);
  });

  it('covers every byte exactly once, whatever the size', () => {
    for (const size of [0, 1, 199, 200, 201, 450, 1000]) {
      const ranges = planChunkRanges(size, 200);
      expect(ranges.map((range) => range.end - range.start)).toEqual(
        ranges.map(() => expect.any(Number)),
      );
      expect(ranges.length).toBe(chunkCountFor(size, 200));
      expect(ranges.reduce((sum, range) => sum + (range.end - range.start), 0)).toBe(size);
      // Contiguous and in order, so reassembly is a concatenation.
      let offset = 0;
      for (const range of ranges) {
        expect(range.start).toBe(offset);
        expect(range.index).toBe(ranges.indexOf(range));
        offset = range.end;
      }
      expect(ranges.at(-1)?.end ?? 0).toBe(size);
    }
  });

  it('keeps the real encoder graph at three chunks, the last one short', () => {
    // 41,770,866 bytes: two full 16 MiB chunks and 8,216,434 bytes left over.
    const ranges = planChunkRanges(41_770_866, CACHE_CHUNK_BYTES);
    expect(ranges.map((range) => range.end - range.start)).toEqual([
      CACHE_CHUNK_BYTES,
      CACHE_CHUNK_BYTES,
      8_216_434,
    ]);
  });

  it('counts nothing for an empty or nonsensical file', () => {
    expect(chunkCountFor(0)).toBe(0);
    expect(planChunkRanges(0)).toEqual([]);
    expect(chunkCountFor(-1)).toBe(0);
    expect(chunkCountFor(Number.NaN)).toBe(0);
  });
});

describe('categorizeManifestFile', () => {
  it('classifies every file in the real manifest', () => {
    // WebGPU manifest: single-file fp16 encoder (no external `.data`
    // sidecar), int8 decoder, vocab.
    expect(PARAKEET_TDT_V3.files.map(categorizeManifestFile)).toEqual([
      'encoder',
      'decoder',
      'tokenizer',
    ]);
  });

  it('recognizes a preprocessor onnx file', () => {
    expect(categorizeManifestFile('nemo128.onnx')).toBe('preprocessor');
  });

  it('falls back to unknown for anything unrecognized', () => {
    expect(categorizeManifestFile('README.md')).toBe('unknown');
  });
});

/**
 * Live network check: the whole point of resuming with an HTTP Range
 * request is that the server actually honors it. This hits the real
 * HuggingFace resolve endpoint (which redirects to a CDN) the same way
 * `leadDownload` does, confirming the assumption the resumable downloader
 * is built on rather than asserting it in a comment.
 */
describe('HF/CDN Range support (live)', () => {
  it('answers a Range request with 206 + Content-Range for the manifest files', async () => {
    for (const file of PARAKEET_TDT_V3.files) {
      // Self-hosted files (fileUrlOverrides) resolve to a relative dev URL
      // with no server behind it under vitest — and their origin is whoever
      // hosts NEXT_PUBLIC_FP16_ENCODER_URL, not HF. The downloader already
      // degrades gracefully where Range is refused (a 200 restarts the file
      // from zero — see leadDownload), so there is nothing to pin here.
      if (PARAKEET_TDT_V3.fileUrlOverrides?.[file] !== undefined) continue;
      const encodedFile = file.split('/').map(encodeURIComponent).join('/');
      const url = `https://huggingface.co/${PARAKEET_TDT_V3.modelRepo}/resolve/main/${encodedFile}`;
      const res = await fetch(url, { headers: { Range: 'bytes=1000-' } });
      expect(res.status, `expected 206 for a Range request on "${file}"`).toBe(206);
      expect(res.headers.get('content-range'), `missing Content-Range for "${file}"`).toMatch(
        /^bytes 1000-/,
      );
    }
  });
});
