import { cosine } from '../vector-math';
import { MIN_CLASS_SCORE, MIN_MARGIN } from './thresholds';
import type { InsightKind } from './types/insight-kind';
import type { PrototypeVectors } from './types/prototype-vectors';

function maxCosine(vector: Float32Array, prototypes: readonly Float32Array[]): number {
  return prototypes.reduce((best, p) => Math.max(best, cosine(vector, p)), -1);
}

export function classify(vector: Float32Array, kinds: readonly InsightKind[], protos: PrototypeVectors): { kind: InsightKind; score: number } | null {
  const negative = maxCosine(vector, protos.negative);
  const scored = kinds.map((kind) => ({ kind, score: maxCosine(vector, protos[kind]) })).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < MIN_CLASS_SCORE || best.score - negative < MIN_MARGIN) return null;
  return best;
}
