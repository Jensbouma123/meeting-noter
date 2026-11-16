import type { SpillBackend, SpillChunk } from '../types/rescore';
import { requestResult, transactionDone, walkCursor } from './idb-request';

const DB_NAME = 'diarization-spill';
const STORE = 'chunks';

export class IdbSpillBackend implements SpillBackend {
  readonly kind = 'indexeddb' as const;

  private constructor(
    private readonly db: IDBDatabase,
    private readonly spill: string,
  ) {}

  static async open(spill: string, factory: IDBFactory): Promise<IdbSpillBackend> {
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: ['spill', 'offset'] });
    };
    const backend = new IdbSpillBackend(await requestResult(request), spill);
    await backend.truncate(0);
    return backend;
  }

  async write(offset: number, data: Int16Array): Promise<void> {
    const tx = this.db.transaction(STORE, 'readwrite');
    const chunk: SpillChunk = { spill: this.spill, offset, data };
    tx.objectStore(STORE).put(chunk);
    await transactionDone(tx);
  }

  async read(offset: number, length: number): Promise<Int16Array> {
    if (length <= 0) return new Int16Array(0);
    const out = new Int16Array(length);
    const end = offset + length;
    let filled = 0;
    const tx = this.db.transaction(STORE, 'readonly');
    const range = IDBKeyRange.bound([this.spill, 0], [this.spill, end], false, true);
    await walkCursor(tx.objectStore(STORE).openCursor(range, 'prev'), (cursor) => {
      const chunk = cursor.value as SpillChunk;
      const from = Math.max(chunk.offset, offset);
      const to = Math.min(chunk.offset + chunk.data.length, end);
      if (to > from) {
        out.set(chunk.data.subarray(from - chunk.offset, to - chunk.offset), from - offset);
        filled = Math.max(filled, to - offset);
      }
      return chunk.offset > offset;
    });
    return out.subarray(0, filled);
  }

  async truncate(length: number): Promise<void> {
    const tx = this.db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.delete(IDBKeyRange.bound([this.spill, length], [this.spill, Infinity]));
    if (length > 0) {
      const below = IDBKeyRange.bound([this.spill, 0], [this.spill, length], false, true);
      await walkCursor(store.openCursor(below, 'prev'), (cursor) => {
        const chunk = cursor.value as SpillChunk;
        if (chunk.offset + chunk.data.length > length) {
          cursor.update({ ...chunk, data: chunk.data.slice(0, length - chunk.offset) });
        }
        return false;
      });
    }
    await transactionDone(tx);
  }

  async remove(): Promise<void> {
    const tx = this.db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(IDBKeyRange.bound([this.spill, 0], [this.spill, Infinity]));
    await transactionDone(tx);
    this.db.close();
  }
}
