import { describe, expect, it } from 'vitest';
import {
  CACHE_CHUNK_BYTES,
  categorizeManifestFile,
  chunkCountFor,
  planChunkRanges,
} from './resumable-download';
import { PARAKEET_TDT_V3 } from './model-manifest';

describe('chunk arithmetic', () => {
  it('puts an exact multiple of the chunk size in whole chunks, with no empty one after it', () => {
    expect(planChunkRanges(600, 200)).toEqual([
      { index: 0, start: 0, end: 200 },
      { index: 1, start: 200, end: 400 },
      { index: 2, start: 400, end: 600 },
    ]);
    expect(chunkCountFor(600, 200)).toBe(3);
  });

  it('leaves one short chunk when the file is not a whole number of them', () => {
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

describe('HF/CDN Range support (live)', () => {
  it('answers a Range request with 206 + Content-Range for the manifest files', async () => {
    for (const file of PARAKEET_TDT_V3.files) {
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
