import { chapterBoundaries } from './chapter-boundaries';
import { termCounts } from './chapter-terms';
import type { Chapter, ChapterOpts, Window } from './types';

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

  const cuts = chapterBoundaries(vectors, minLen, sensitivity, block);
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
