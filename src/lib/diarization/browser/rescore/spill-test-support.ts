import type { OpfsDirectoryLike, SyncAccessHandleLike } from '../types/rescore';

export function fakeHandle(): SyncAccessHandleLike & { bytes: () => Uint8Array; closed: () => boolean } {
  let bytes = new Uint8Array(0);
  let closed = false;
  const view = (buffer: ArrayBufferView) => new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return {
    write(buffer, { at }) {
      const src = view(buffer);
      if (at + src.length > bytes.length) {
        const grown = new Uint8Array(at + src.length);
        grown.set(bytes);
        bytes = grown;
      }
      bytes.set(src, at);
      return src.length;
    },
    read(buffer, { at }) {
      const dst = view(buffer);
      const part = bytes.subarray(at, at + dst.length);
      dst.set(part);
      return part.length;
    },
    truncate(size) {
      bytes = bytes.slice(0, size);
    },
    flush() {},
    close() {
      closed = true;
    },
    bytes: () => bytes,
    closed: () => closed,
  };
}

export function fakeDirectory(
  handle: SyncAccessHandleLike | null,
): OpfsDirectoryLike & { files: Set<string> } {
  const files = new Set<string>();
  return {
    files,
    async getFileHandle(name) {
      files.add(name);
      return handle ? { createSyncAccessHandle: async () => handle } : {};
    },
    async removeEntry(name) {
      files.delete(name);
    },
  };
}
