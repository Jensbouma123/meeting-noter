import type { ChunkRange } from '../types/download-cache-records';
import { CACHE_CHUNK_BYTES } from './constants';

export function chunkCountFor(size: number, chunkBytes: number = CACHE_CHUNK_BYTES): number {
  if (!Number.isFinite(size) || size <= 0 || chunkBytes <= 0) return 0;
  return Math.ceil(size / chunkBytes);
}

export function planChunkRanges(size: number, chunkBytes: number = CACHE_CHUNK_BYTES): ChunkRange[] {
  const ranges: ChunkRange[] = [];
  for (let start = 0, index = 0; start < size; start += chunkBytes, index += 1) {
    ranges.push({ index, start, end: Math.min(size, start + chunkBytes) });
  }
  return ranges;
}
