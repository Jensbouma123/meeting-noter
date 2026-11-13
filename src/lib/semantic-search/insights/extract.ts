import { cosine } from '../vector-math';
import type { Embedder } from '../types';
import { candidateKinds } from './candidate-gate';
import { classify } from './classify';
import { mergeFragments } from './merge-fragments';
import { NEGATIVE_PROTOTYPES } from './negative-prototypes';
import { ACTION_PROTOTYPES, DECISION_PROTOTYPES } from './prototypes';
import { splitSentences } from './split-sentences';
import { DEDUPE_COSINE, MAX_PER_KIND } from './thresholds';
import type { Segment } from '@/lib/meeting/types';
import type { Insight } from './types/insight';
import type { InsightKind } from './types/insight-kind';
import type { PrototypeVectors } from './types/prototype-vectors';

const BATCH = 32;

async function embedAll(embedder: Embedder, texts: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += BATCH) out.push(...(await embedder.embed(texts.slice(i, i + BATCH), 'document')));
  return out;
}

async function prototypeVectors(embedder: Embedder): Promise<PrototypeVectors> {
  const all = await embedAll(embedder, [...DECISION_PROTOTYPES, ...ACTION_PROTOTYPES, ...NEGATIVE_PROTOTYPES]);
  const d = DECISION_PROTOTYPES.length;
  const a = d + ACTION_PROTOTYPES.length;
  return { decision: all.slice(0, d), action: all.slice(d, a), negative: all.slice(a) };
}

export async function extractInsights(segments: readonly Segment[], embedder: Embedder): Promise<Insight[]> {
  const candidates = splitSentences(mergeFragments(segments))
    .map((sentence) => ({ sentence, kinds: candidateKinds(sentence.text) }))
    .filter((c) => c.kinds.length > 0);
  if (candidates.length === 0) return [];
  const protos = await prototypeVectors(embedder);
  const vectors = await embedAll(embedder, candidates.map((c) => c.sentence.text));
  const kept: { insight: Insight; vector: Float32Array }[] = [];
  candidates.forEach(({ sentence: s, kinds }, i) => {
    const hit = classify(vectors[i], kinds, protos);
    if (!hit || kept.some((k) => cosine(k.vector, vectors[i]) >= DEDUPE_COSINE)) return;
    kept.push({
      vector: vectors[i],
      insight: { id: `${hit.kind}:${s.id}`, kind: hit.kind, text: s.text, segmentId: s.segmentId, speakerId: s.speakerId, start: s.start, score: hit.score },
    });
  });
  const top = (kind: InsightKind) =>
    kept.map((k) => k.insight).filter((i) => i.kind === kind).sort((a, b) => b.score - a.score).slice(0, MAX_PER_KIND);
  return [...top('decision'), ...top('action')].sort((a, b) => a.start - b.start);
}
