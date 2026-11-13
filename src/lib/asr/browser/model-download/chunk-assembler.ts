import type { ChunkBytes } from '../types/download-cache-records';
import { Sha256 } from '../sha256';
import { CACHE_CHUNK_BYTES } from './constants';

export abstract class ChunkAssembler {
  protected buffer: ChunkBytes | null = null;
  protected fill = 0;
  protected sealedChunks = 0;
  protected storedTailLength = -1;
  protected loadedBytes = 0;
  protected readonly retained: ChunkBytes[] | null;
  private checksumFinalized = false;

  constructor(
    retain: boolean,
    protected readonly hasher: Sha256 | null,
  ) {
    this.retained = retain ? [] : null;
  }

  protected abstract writeChunk(index: number, bytes: ChunkBytes): Promise<void>;

  checksum(): string | null {
    if (!this.hasher) return null;
    if (!this.checksumFinalized) {
      if (this.fill > 0) this.hasher.update((this.buffer as ChunkBytes).subarray(0, this.fill));
      this.checksumFinalized = true;
    }
    return this.hasher.digest();
  }

  get loaded(): number {
    return this.loadedBytes;
  }

  get chunkCount(): number {
    return this.sealedChunks + (this.fill > 0 ? 1 : 0);
  }

  completeParts(): ChunkBytes[] {
    if (!this.retained) return [];
    return this.fill > 0 ? [...this.retained, this.tailCopy()] : [...this.retained];
  }

  async append(bytes: Uint8Array): Promise<void> {
    let offset = 0;
    while (offset < bytes.length) {
      if (this.buffer === null) this.buffer = new Uint8Array(CACHE_CHUNK_BYTES);
      const take = Math.min(CACHE_CHUNK_BYTES - this.fill, bytes.length - offset);
      this.buffer.set(bytes.subarray(offset, offset + take), this.fill);
      this.fill += take;
      this.loadedBytes += take;
      offset += take;
      if (this.fill === CACHE_CHUNK_BYTES) await this.seal();
    }
  }

  release(): void {
    if (this.retained) this.retained.length = 0;
    this.buffer = null;
    this.fill = 0;
    this.storedTailLength = -1;
  }

  protected clearMemory(): void {
    this.buffer = null;
    this.fill = 0;
    this.sealedChunks = 0;
    this.storedTailLength = -1;
    this.loadedBytes = 0;
    if (this.retained) this.retained.length = 0;
    this.hasher?.reset();
    this.checksumFinalized = false;
  }

  private async seal(): Promise<void> {
    const chunk = this.buffer as ChunkBytes;
    this.hasher?.update(chunk);
    this.retained?.push(chunk);
    this.sealedChunks += 1;
    this.fill = 0;
    this.buffer = null;
    this.storedTailLength = -1;
    await this.writeChunk(this.sealedChunks - 1, chunk);
  }

  private tailCopy(): ChunkBytes {
    return (this.buffer as ChunkBytes).slice(0, this.fill);
  }
}
