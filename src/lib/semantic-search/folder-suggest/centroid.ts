import { cosine, normalizedCopy } from '../vector-math';
import { MIN_MEETING_WINDOWS } from './thresholds';

export function meanVector(vectors: Float32Array[]): Float32Array | null {
  if (vectors.length === 0) return null;
  const sum = new Float32Array(vectors[0].length);
  for (const v of vectors) for (let i = 0; i < sum.length; i++) sum[i] += v[i];
  return normalizedCopy(sum);
}

export function meetingCentroid(vectors: Float32Array[]): Float32Array | null {
  return vectors.length >= MIN_MEETING_WINDOWS ? meanVector(vectors) : null;
}

export function centroidSimilarity(a: Float32Array, b: Float32Array): number {
  return cosine(a, b);
}
