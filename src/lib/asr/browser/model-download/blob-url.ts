import type { ChunkBytes } from '../types/download-cache-records';

const blobUrlBytes = new Map<string, ChunkBytes>();

export function blobUrlFor(parts: ChunkBytes[]): string {
  let bytes: ChunkBytes;
  if (parts.length === 1) {
    bytes = parts[0];
  } else {
    const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  blobUrlBytes.set(url, bytes);
  return url;
}

export function takeBlobUrlBytes(url: string): Uint8Array | null {
  const bytes = blobUrlBytes.get(url) ?? null;
  blobUrlBytes.delete(url);
  return bytes;
}
