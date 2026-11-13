import { compressBlock } from './sha256-compress';
import { INITIAL_HASH_STATE } from './sha256-constants';

const BLOCK_BYTES = 64;
const LENGTH_OFFSET = 56;

export class Sha256 {
  private readonly state = new Uint32Array(8);
  private readonly block = new Uint8Array(BLOCK_BYTES);
  private readonly schedule = new Uint32Array(64);
  private blockLength = 0;
  private totalBytes = 0;
  private finished = false;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.state.set(INITIAL_HASH_STATE);
    this.blockLength = 0;
    this.totalBytes = 0;
    this.finished = false;
  }

  update(bytes: Uint8Array): this {
    if (this.finished) throw new Error('Sha256: update() after digest');
    this.totalBytes += bytes.length;
    let offset = 0;

    if (this.blockLength > 0) {
      const take = Math.min(BLOCK_BYTES - this.blockLength, bytes.length);
      this.block.set(bytes.subarray(0, take), this.blockLength);
      this.blockLength += take;
      offset = take;
      if (this.blockLength < BLOCK_BYTES) return this;
      this.compress(this.block, 0);
      this.blockLength = 0;
    }

    for (; offset + BLOCK_BYTES <= bytes.length; offset += BLOCK_BYTES) {
      this.compress(bytes, offset);
    }

    if (offset < bytes.length) {
      this.block.set(bytes.subarray(offset), 0);
      this.blockLength = bytes.length - offset;
    }
    return this;
  }

  digest(): string {
    if (!this.finished) this.appendPaddingAndLength();
    let out = '';
    for (let i = 0; i < 8; i += 1) {
      out += (this.state[i] >>> 0).toString(16).padStart(8, '0');
    }
    return out;
  }

  private appendPaddingAndLength(): void {
    this.finished = true;
    const bitLength = this.totalBytes * 8;
    this.block[this.blockLength++] = 0x80;
    if (this.blockLength > LENGTH_OFFSET) {
      this.block.fill(0, this.blockLength);
      this.compress(this.block, 0);
      this.blockLength = 0;
    }
    this.block.fill(0, this.blockLength, LENGTH_OFFSET);
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    const view = new DataView(this.block.buffer, this.block.byteOffset);
    view.setUint32(LENGTH_OFFSET, high, false);
    view.setUint32(LENGTH_OFFSET + 4, low, false);
    this.compress(this.block, 0);
  }

  private compress(data: Uint8Array, offset: number): void {
    compressBlock(this.state, this.schedule, data, offset);
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return new Sha256().update(bytes).digest();
}
