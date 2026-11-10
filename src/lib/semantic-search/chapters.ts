import { tokenize } from './text';
import type { Chapter, Window } from './types';

export interface ChapterOpts {
  /** Fewest windows a chapter may span. Default 4. */
  minChapterWindows?: number;
  /** A dip must sit this many standard deviations below the mean similarity. Default 1. */
  sensitivity?: number;
  /** Windows on each side of a gap that are pooled before comparing. Default 3. */
  blockWindows?: number;
  /** Terms per title. Default 3. */
  termsPerTitle?: number;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Sum of `vectors[from..to]` (inclusive), not normalized. */
function pool(vectors: Float32Array[], from: number, to: number): Float32Array {
  const out = new Float32Array(vectors[0].length);
  for (let i = from; i <= to; i++) {
    for (let j = 0; j < out.length; j++) out[j] += vectors[i][j];
  }
  return out;
}

function cosine(a: Float32Array, b: Float32Array): number {
  const na = Math.sqrt(dot(a, a));
  const nb = Math.sqrt(dot(b, b));
  return na > 0 && nb > 0 ? dot(a, b) / (na * nb) : 0;
}

/**
 * Splits one meeting's windows into topic chapters. A boundary is a local dip
 * in block similarity (TextTiling-style: the `blockWindows` windows before a
 * gap against the `blockWindows` after it) that falls well below the
 * meeting's mean. Pooling makes single-window noise matter less. Deepest dips
 * are taken first, and a cut is rejected when it would leave a chapter
 * shorter than `minChapterWindows`.
 *
 * `vectors[i]` must be the embedding of `windows[i]`, unit-length or zero.
 */
export function findChapters(
  meetingId: string,
  windows: Window[],
  vectors: Float32Array[],
  opts: ChapterOpts = {},
): Chapter[] {
  if (windows.length !== vectors.length) {
    throw new RangeError('windows and vectors must have the same length');
  }
  const n = windows.length;
  if (n === 0) return [];

  const minLen = Math.max(1, opts.minChapterWindows ?? 4);
  const sensitivity = opts.sensitivity ?? 1;
  const termsPerTitle = opts.termsPerTitle ?? 3;
  const block = Math.max(1, opts.blockWindows ?? 3);

  const cuts = boundaries(vectors, minLen, sensitivity, block);
  const ranges: Array<[number, number]> = [];
  let from = 0;
  for (const cut of [...cuts, n]) {
    ranges.push([from, cut]);
    from = cut;
  }

  const termsByChapter = ranges.map(([a, b]) => termCounts(windows.slice(a, b)));
  const df = new Map<string, number>();
  for (const counts of termsByChapter) {
    for (const term of counts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const C = ranges.length;

  return ranges.map(([a, b], i) => {
    const counts = termsByChapter[i];
    const scored = [...counts.entries()].map(([term, count]) => {
      const idf = Math.log((C + 1) / ((df.get(term) ?? 0) + 1)) + 1;
      return { term, score: count * idf };
    });
    scored.sort((x, y) => y.score - x.score || (x.term < y.term ? -1 : 1));
    const terms = scored.slice(0, termsPerTitle).map((s) => s.term);
    return {
      meetingId,
      index: i,
      start: windows[a].start,
      end: windows[b - 1].end,
      windowStart: a,
      windowEnd: b,
      title: terms.length > 0 ? terms.join(' · ') : `Chapter ${i + 1}`,
      terms,
    };
  });
}

/** Cut positions (first window of each new chapter), ascending. */
function boundaries(
  vectors: Float32Array[],
  minLen: number,
  sensitivity: number,
  block: number,
): number[] {
  const n = vectors.length;
  if (n < 2 * minLen) return [];

  // sims[i] = block similarity across the gap between windows i and i+1.
  const sims: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const left = pool(vectors, Math.max(0, i - block + 1), i);
    const right = pool(vectors, i + 1, Math.min(n - 1, i + block));
    sims.push(cosine(left, right));
  }
  const mean = sims.reduce((s, x) => s + x, 0) / sims.length;
  const std = Math.sqrt(sims.reduce((s, x) => s + (x - mean) ** 2, 0) / sims.length);
  const threshold = mean - sensitivity * std;

  const candidates: number[] = [];
  for (let i = 1; i + 1 < sims.length; i++) {
    if (sims[i] < threshold && sims[i] <= sims[i - 1] && sims[i] < sims[i + 1]) {
      candidates.push(i + 1);
    }
  }
  candidates.sort((a, b) => sims[a - 1] - sims[b - 1]);

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

function termCounts(windows: Window[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of windows) {
    for (const token of tokenize(w.text)) {
      if (token.length < 3) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return counts;
}
