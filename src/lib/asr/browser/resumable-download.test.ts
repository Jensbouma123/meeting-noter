import { describe, expect, it } from 'vitest';
import {
  decideResume,
  isSizeValid,
  shouldVerifyHash,
} from './resumable-download';

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
