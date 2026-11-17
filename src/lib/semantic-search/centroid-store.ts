import type { KeyValueStore } from './types';
import { meetingCentroid } from './folder-suggest/centroid';

export function centroidKey(meetingId: string): string {
  return `mn.semcentroid.${meetingId}.v1`;
}

function toBase64(v: Float32Array): string {
  const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(s: string): Float32Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

export function writeCentroid(
  meetingId: string,
  indexedAt: number,
  vectors: Float32Array[],
  store: KeyValueStore,
): void {
  const centroid = meetingCentroid(vectors);
  store.setItem(
    centroidKey(meetingId),
    JSON.stringify({ indexedAt, centroid: centroid ? toBase64(centroid) : null }),
  );
}

export function readCentroid(
  meetingId: string,
  store: KeyValueStore,
): { indexedAt: number; centroid: Float32Array | null } | null {
  try {
    const raw = store.getItem(centroidKey(meetingId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.indexedAt !== 'number') return null;
    return { indexedAt: p.indexedAt, centroid: typeof p.centroid === 'string' ? fromBase64(p.centroid) : null };
  } catch {
    return null;
  }
}

export function removeCentroid(meetingId: string, store: KeyValueStore): void {
  store.removeItem(centroidKey(meetingId));
}
