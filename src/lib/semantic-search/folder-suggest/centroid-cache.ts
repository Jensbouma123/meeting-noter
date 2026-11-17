import { readCentroid, writeCentroid } from '../centroid-store';
import { meetingCentroid } from './centroid';
import { defaultKeyValueStore } from '../default-store';
import { loadIndex } from '../store';
import type { KeyValueStore } from '../types';

const cache = new Map<string, { indexedAt: number; centroid: Float32Array | null }>();

export function clearCentroidCache(): void {
  cache.clear();
}

function backfill(meetingId: string, store: KeyValueStore): Float32Array | null {
  const index = loadIndex(meetingId, store);
  if (!index) return null;
  try {
    writeCentroid(meetingId, index.indexedAt, index.vectors, store);
  } catch {}
  return meetingCentroid(index.vectors);
}

export function cachedCentroid(
  meetingId: string,
  store: KeyValueStore | null = defaultKeyValueStore(),
): Float32Array | null {
  if (!store) return null;
  const stored = readCentroid(meetingId, store);
  if (!stored) return backfill(meetingId, store);
  const hit = cache.get(meetingId);
  if (hit?.indexedAt === stored.indexedAt) return hit.centroid;
  cache.set(meetingId, stored);
  return stored.centroid;
}
