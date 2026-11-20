import type { HypSegment } from '../types/hyp-segment';
import type { RefTurn } from '../types/ref-turn';
import type { SpeakerWerScore, WerScore } from '../types/wer-score';
import { numberWords } from './number-words';

const NUMBER = /^\d[\d,]*(?:\.\d+)?$/;

/** Lowercase words without [tags], punctuation or apostrophes; digits spelled out. */
export function normalizeWords(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/%/g, ' percent ')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/(\d)\.(?=\d)/g, '$1\u0000')
    .replace(/[^\p{L}\p{N}\u0000]+/gu, ' ')
    .replace(/\u0000/g, '.');
  return cleaned.split(/\s+/).filter(Boolean).flatMap((w) => (NUMBER.test(w) ? numberWords(w) : [w]));
}

/** Word-level Levenshtein distance (substitutions + deletions + insertions). */
export function editDistance(ref: string[], hyp: string[]): number {
  let prev = Int32Array.from({ length: hyp.length + 1 }, (_, j) => j);
  let cur = new Int32Array(hyp.length + 1);
  for (let i = 1; i <= ref.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= hyp.length; j += 1) {
      const sub = prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      cur[j] = Math.min(sub, prev[j] + 1, cur[j - 1] + 1);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[hyp.length];
}

export function werOf(ref: string[], hyp: string[]): WerScore {
  const edits = editDistance(ref, hyp);
  return { refWords: ref.length, hypWords: hyp.length, edits, wer: ref.length ? edits / ref.length : hyp.length ? 1 : 0 };
}

const byStart = <T extends { start: number; end: number }>(xs: T[]): T[] => [...xs].sort((a, b) => a.start - b.start || a.end - b.end);
const wordsOf = (xs: { start: number; end: number; text?: string }[]): string[] => byStart(xs).flatMap((x) => normalizeWords(x.text ?? ''));
const hasText = (turns: RefTurn[]): boolean => turns.some((t) => typeof t.text === 'string');

/** Corpus WER: all hyp lines vs all reference turns, each joined in time order. Null without reference text. */
export function corpusWer(turns: RefTurn[], segs: HypSegment[]): WerScore | null {
  return hasText(turns) ? werOf(wordsOf(turns), wordsOf(segs)) : null;
}

/**
 * Per-speaker WER: each reference speaker's turns vs the hyp lines whose label maps to
 * that speaker through `labelMap` (label -> speaker). Unmapped lines count for nobody.
 */
export function speakerWer(turns: RefTurn[], segs: HypSegment[], labelMap: Record<string, string>): SpeakerWerScore[] {
  if (!hasText(turns)) return [];
  const speakers = [...new Set(turns.map((t) => t.speaker))].sort();
  return speakers.map((speaker) => {
    const labels = Object.keys(labelMap).filter((l) => labelMap[l] === speaker).sort();
    const mine = segs.filter((s) => s.label != null && labelMap[s.label] === speaker);
    return { speaker, labels, ...werOf(wordsOf(turns.filter((t) => t.speaker === speaker)), wordsOf(mine)) };
  });
}
