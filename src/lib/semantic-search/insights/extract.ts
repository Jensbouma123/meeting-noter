import { cosine } from '../vector-math';
import type { Embedder } from '../types';
import { ACTION_PROTOTYPES, DECISION_PROTOTYPES } from './prototypes';
import { splitSentences } from './split-sentences';
import { DEDUPE_COSINE, MAX_PER_KIND, MIN_CLASS_SCORE, MIN_MARGIN, MIN_WORDS } from './thresholds';
import type { Segment } from '@/lib/meeting/types';
import type { Insight } from './types/insight';
import type { InsightKind } from './types/insight-kind';

const BATCH = 32;

function maxCosine(vector: Float32Array, prototypes: Float32Array[]): number {
  return prototypes.reduce((best, p) => Math.max(best, cosine(vector, p)), -1);
}

async function embedAll(embedder: Embedder, texts: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += BATCH) out.push(...(await embedder.embed(texts.slice(i, i + BATCH), 'document')));
  return out;
}

function classify(v: Float32Array, decisions: Float32Array[], actions: Float32Array[]): { kind: InsightKind; score: number } | null {
  const d = maxCosine(v, decisions);
  const a = maxCosine(v, actions);
  const kind: InsightKind = d >= a ? 'decision' : 'action';
  const score = Math.max(d, a);
  return score >= MIN_CLASS_SCORE && Math.abs(d - a) >= MIN_MARGIN ? { kind, score } : null;
}

export async function extractInsights(segments: readonly Segment[], embedder: Embedder): Promise<Insight[]> {
  const sentences = splitSentences(segments).filter((s) => s.text.split(/\s+/).length >= MIN_WORDS);
  if (sentences.length === 0) return [];
  const all = await embedAll(embedder, [...DECISION_PROTOTYPES, ...ACTION_PROTOTYPES, ...sentences.map((s) => s.text)]);
  const decisions = all.slice(0, DECISION_PROTOTYPES.length);
  const actions = all.slice(DECISION_PROTOTYPES.length, DECISION_PROTOTYPES.length + ACTION_PROTOTYPES.length);
  const vectors = all.slice(DECISION_PROTOTYPES.length + ACTION_PROTOTYPES.length);
  const kept: { insight: Insight; vector: Float32Array }[] = [];
  sentences.forEach((s, i) => {
    const hit = classify(vectors[i], decisions, actions);
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
