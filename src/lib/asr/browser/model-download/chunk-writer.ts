import type {
  CachedFileRecord,
  ChunkBytes,
  PartialFileRecord,
} from '../types/download-cache-records';
import type { Sha256 } from '../sha256';
import {
  deleteChunksFrom,
  deleteMetaRecord,
  getChunk,
  getChunks,
  putChunk,
  putMetaRecord,
} from './cache-primitives';
import { deleteCachedFile } from './cached-files';
import { ChunkAssembler } from './chunk-assembler';
import { CACHE_CHUNK_BYTES, FILE_STORE, PARTIAL_STORE } from './constants';

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class ChunkWriter extends ChunkAssembler {
  private bytesStored = true;

  constructor(
    private readonly key: string,
    private readonly totalBytes: number,
    private readonly etag: string | null,
    retain: boolean,
    private readonly onWriteFailure: (detail: string) => void,
    hasher: Sha256 | null = null,
  ) {
    super(retain, hasher);
  }

  async flushPartial(): Promise<void> {
    await this.writeTailIfChanged();
    await this.safely('Recording resume progress', () =>
      putMetaRecord(PARTIAL_STORE, this.key, this.partialRecord()),
    );
  }

  async resumeFrom(record: PartialFileRecord): Promise<boolean> {
    const sealed = record.sealedChunks;
    const tailLength = record.loadedBytes - sealed * CACHE_CHUNK_BYTES;
    if (!Number.isInteger(sealed) || sealed < 0) return false;
    if (!Number.isInteger(tailLength) || tailLength < 0 || tailLength >= CACHE_CHUNK_BYTES) return false;

    if (this.retained) {
      const prefix = await getChunks(this.key, sealed);
      if (prefix.length !== sealed) return false;
      if (prefix.some((part) => part.byteLength !== CACHE_CHUNK_BYTES)) return false;
      this.retained.push(...prefix);
      for (const part of prefix) this.hasher?.update(part);
    }
    if (tailLength > 0) {
      const tail = await getChunk(this.key, sealed);
      if (!tail || tail.byteLength < tailLength) return false;
      this.buffer = new Uint8Array(CACHE_CHUNK_BYTES);
      this.buffer.set(tail.subarray(0, tailLength));
      this.fill = tailLength;
    }
    this.sealedChunks = sealed;
    this.loadedBytes = record.loadedBytes;
    this.storedTailLength = -1;
    return true;
  }

  async reset(): Promise<void> {
    await this.safely('Clearing a stale partial download', () => deleteCachedFile(this.key));
    this.clearMemory();
  }

  async commit(): Promise<void> {
    await this.writeTailIfChanged();
    if (!this.bytesStored) {
      await this.safely('Clearing the cached-file record for a file that was not stored', () =>
        deleteMetaRecord(FILE_STORE, this.key),
      );
      await this.safely('Clearing the resume record', () => deleteMetaRecord(PARTIAL_STORE, this.key));
      return;
    }
    await this.safely('Trimming stale chunks', () => deleteChunksFrom(this.key, this.chunkCount));
    await this.safely('Recording the file as cached', () =>
      putMetaRecord(FILE_STORE, this.key, {
        size: this.loadedBytes,
        chunkCount: this.chunkCount,
        updatedAt: Date.now(),
      } satisfies CachedFileRecord),
    );
    await this.safely('Clearing the resume record', () => deleteMetaRecord(PARTIAL_STORE, this.key));
  }

  protected async writeChunk(index: number, bytes: ChunkBytes): Promise<void> {
    try {
      await putChunk(this.key, index, bytes);
    } catch (err) {
      this.bytesStored = false;
      this.onWriteFailure(`Writing a chunk to the model cache (${describeError(err)})`);
    }
  }

  private async writeTailIfChanged(): Promise<void> {
    if (this.fill > 0 && this.fill !== this.storedTailLength) {
      await this.writeChunk(this.sealedChunks, (this.buffer as ChunkBytes).subarray(0, this.fill));
      this.storedTailLength = this.fill;
    }
  }

  private async safely(what: string, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (err) {
      this.onWriteFailure(`${what} (${describeError(err)})`);
    }
  }

  private partialRecord(): PartialFileRecord {
    return {
      loadedBytes: this.loadedBytes,
      totalBytes: this.totalBytes,
      etag: this.etag,
      sealedChunks: this.sealedChunks,
      updatedAt: Date.now(),
    };
  }
}
