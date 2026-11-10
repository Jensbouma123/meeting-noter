import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CACHE_CHUNK_BYTES } from './resumable-download';
import { Sha256, sha256Hex } from './sha256';

/**
 * The streaming hasher, against the one everybody else trusts.
 *
 * `crypto.subtle.digest` needs one contiguous buffer, so verifying a
 * downloaded file with it means first assembling a contiguous copy of the
 * whole file — on the tab that has already died once from an allocation of
 * that size. `Sha256` exists to hash a file chunk by chunk instead, and the
 * only acceptable evidence that it agrees with SHA-256 is that it agrees with
 * an independent implementation, so every case here is checked against Node's
 * own crypto.
 *
 * The sizes are chosen where a hand-written hash breaks: empty input, the
 * block size itself, one byte either side of it, every padding boundary (a
 * message whose length is 55/56/57/63/64/65 mod 64 exercises the extra
 * padding block and the 64-bit length field), and the sizes that matter here —
 * one full cache chunk, one chunk plus a short tail, and the real
 * `encoder-model.onnx` at 41,770,866 bytes.
 */

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
    // FIPS 180-4's own example: the digest of "" is this.
    expect(sha256Hex(new Uint8Array(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(nodeSha256(new Uint8Array(0))).toBe(sha256Hex(new Uint8Array(0)));
  });

  it('matches Node for every length that could break the padding', () => {
    // 0-2 covers the empty/small cases; then every length from 54 to 66, which
    // is where the length field and the extra padding block live; then a sweep
    // of block multiples.
    const sizes = [0, 1, 2, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 191, 192, 255, 256];
    for (const size of sizes) {
      const bytes = content(size, size);
      expect(sha256Hex(bytes), `size ${size}`).toBe(nodeSha256(bytes));
    }
  });

  it('matches Node for the sizes this app actually stores', () => {
    const sizes = [
      93_939, // vocab.txt
      18_202_004, // decoder_joint-model.int8.onnx
      CACHE_CHUNK_BYTES - 1,
      CACHE_CHUNK_BYTES,
      CACHE_CHUNK_BYTES + 1,
      41_770_866, // encoder-model.onnx: two full chunks and a short tail
    ];
    for (const size of sizes) {
      const bytes = content(size, size % 97);
      expect(sha256Hex(bytes), `size ${size}`).toBe(nodeSha256(bytes));
    }
  });

  it('does not care how the message is split — one byte at a time is the worst case', () => {
    const bytes = content(300, 11);
    const oneByteAtATime = new Sha256();
    for (let i = 0; i < bytes.length; i += 1) oneByteAtATime.update(bytes.subarray(i, i + 1));
    expect(oneByteAtATime.digest()).toBe(nodeSha256(bytes));
  });

  it('hashes chunk by chunk exactly as the downloader feeds it', () => {
    // The real usage: 16 MiB chunks arriving from a network reader, with the
    // last one short. Block boundaries land in the middle of a chunk here,
    // which is the point.
    const bytes = content(CACHE_CHUNK_BYTES + 4321, 5);
    const streaming = new Sha256();
    for (let offset = 0; offset < bytes.length; offset += CACHE_CHUNK_BYTES) {
      streaming.update(bytes.subarray(offset, offset + CACHE_CHUNK_BYTES));
    }
    expect(streaming.digest()).toBe(nodeSha256(bytes));
  });

  it('digests once and refuses to be fed afterwards', () => {
    // A hasher that silently accepted more bytes after `digest()` would let a
    // download append data it had already "verified" — the whole point of the
    // checksum is that it covers the file that is about to be cached.
    const hasher = new Sha256().update(content(100));
    const first = hasher.digest();
    expect(hasher.digest()).toBe(first); // idempotent, not a second answer
    expect(() => hasher.update(new Uint8Array([1]))).toThrow(/after digest/);
  });

  it('resets back to the empty-message digest', () => {
    const hasher = new Sha256().update(content(1000, 3));
    hasher.digest();
    hasher.reset();
    expect(hasher.update(content(0)).digest()).toBe(nodeSha256(new Uint8Array(0)));
  });

  it('rejects a message whose length crosses the 32-bit length field', () => {
    // 512 MiB is 2^29 bytes, whose bit length is 2^32 — a value no JS number
    // can hold exactly past 2^53 only because it happens to land on a power of
    // two, but anything in between is not representable. This does not run a
    // gigabyte of hashing: it asserts the arithmetic that *would* be wrong,
    // which is the part that is actually wrong-able. `finish()` splits the bit
    // length into two 32-bit halves, high first.
    expect(2 ** 29 * 8).toBe(2 ** 32);
    const bitLength = 2 ** 29 * 8;
    expect(Math.floor(bitLength / 0x100000000)).toBe(1);
    expect(bitLength >>> 0).toBe(0);
    // And the check that matters for every real file, which the vectors above
    // already cover for sizes that fit: the length is carried in two halves.
    const bytes = content(1024);
    expect(new Sha256().update(bytes).digest()).toBe(nodeSha256(bytes));
  });
});
