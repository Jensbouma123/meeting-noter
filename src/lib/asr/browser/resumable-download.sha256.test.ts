import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CACHE_CHUNK_BYTES } from './resumable-download';
import { Sha256, sha256Hex } from './sha256';

function content(length: number, seed = 0): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8) + seed) % 251;
  return bytes;
}

function nodeSha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('Sha256', () => {
  it('matches the published test vector for the empty message', () => {
    expect(sha256Hex(new Uint8Array(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(nodeSha256(new Uint8Array(0))).toBe(sha256Hex(new Uint8Array(0)));
  });

  it('matches Node for every length that could break the padding', () => {
    const sizes = [0, 1, 2, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 191, 192, 255, 256];
    for (const size of sizes) {
      const bytes = content(size, size);
      expect(sha256Hex(bytes), `size ${size}`).toBe(nodeSha256(bytes));
    }
  });

  it('matches Node for the sizes this app actually stores', () => {
    const sizes = [
      93_939,
      18_202_004,
      CACHE_CHUNK_BYTES - 1,
      CACHE_CHUNK_BYTES,
      CACHE_CHUNK_BYTES + 1,
      41_770_866,
    ];
    for (const size of sizes) {
      const bytes = content(size, size % 97);
      expect(sha256Hex(bytes), `size ${size}`).toBe(nodeSha256(bytes));
    }
  }, 60_000);

  it('does not care how the message is split — one byte at a time is the worst case', () => {
    const bytes = content(300, 11);
    const oneByteAtATime = new Sha256();
    for (let i = 0; i < bytes.length; i += 1) oneByteAtATime.update(bytes.subarray(i, i + 1));
    expect(oneByteAtATime.digest()).toBe(nodeSha256(bytes));
  });

  it('hashes chunk by chunk exactly as the downloader feeds it', () => {
    const bytes = content(CACHE_CHUNK_BYTES + 4321, 5);
    const streaming = new Sha256();
    for (let offset = 0; offset < bytes.length; offset += CACHE_CHUNK_BYTES) {
      streaming.update(bytes.subarray(offset, offset + CACHE_CHUNK_BYTES));
    }
    expect(streaming.digest()).toBe(nodeSha256(bytes));
  });

  it('digests once and refuses to be fed afterwards', () => {
    const hasher = new Sha256().update(content(100));
    const first = hasher.digest();
    expect(hasher.digest()).toBe(first);
    expect(() => hasher.update(new Uint8Array([1]))).toThrow(/after digest/);
  });

  it('resets back to the empty-message digest', () => {
    const hasher = new Sha256().update(content(1000, 3));
    hasher.digest();
    hasher.reset();
    expect(hasher.update(content(0)).digest()).toBe(nodeSha256(new Uint8Array(0)));
  });

  it('rejects a message whose length crosses the 32-bit length field', () => {
    expect(2 ** 29 * 8).toBe(2 ** 32);
    const bitLength = 2 ** 29 * 8;
    expect(Math.floor(bitLength / 0x100000000)).toBe(1);
    expect(bitLength >>> 0).toBe(0);
    const bytes = content(1024);
    expect(new Sha256().update(bytes).digest()).toBe(nodeSha256(bytes));
  });
});
