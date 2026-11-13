import { cosine, poolVectors } from './vector-math';

export function chapterBoundaries(
  vectors: Float32Array[],
  minLen: number,
  sensitivity: number,
  block: number,
): number[] {
  const n = vectors.length;
  if (n < 2 * minLen) return [];
  const gapSimilarity: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const left = poolVectors(vectors, Math.max(0, i - block + 1), i);
    const right = poolVectors(vectors, i + 1, Math.min(n - 1, i + block));
    gapSimilarity.push(cosine(left, right));
  }
  const mean = gapSimilarity.reduce((s, x) => s + x, 0) / gapSimilarity.length;
  const std = Math.sqrt(gapSimilarity.reduce((s, x) => s + (x - mean) ** 2, 0) / gapSimilarity.length);
  const threshold = mean - sensitivity * std;

  const candidates: number[] = [];
  for (let i = 1; i + 1 < gapSimilarity.length; i++) {
    if (gapSimilarity[i] < threshold && gapSimilarity[i] <= gapSimilarity[i - 1] && gapSimilarity[i] < gapSimilarity[i + 1]) {
      candidates.push(i + 1);
    }
  }
  candidates.sort((a, b) => gapSimilarity[a - 1] - gapSimilarity[b - 1]);

  const accepted: number[] = [];
  for (const cut of candidates) {
    const fits =
      cut >= minLen &&
      n - cut >= minLen &&
      accepted.every((other) => Math.abs(other - cut) >= minLen);
    if (fits) accepted.push(cut);
  }
  return accepted.sort((a, b) => a - b);
}
