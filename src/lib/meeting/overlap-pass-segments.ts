import { missedWords, SAME_PHRASE_SECONDS } from './overlap-missed-words';
import { captureSpanOf } from './append-mode';
import { getState, setState } from './store-core';
import { upsertSegment } from './segment-store';
import type { Source } from './types';
import type { AttributedWord, OverlapSpan } from './types/overlap-retranscribe';

export const OVERLAP_SEGMENT_PREFIX = 'ovl-';

export function isOverlapPassSegment(id: string): boolean {
  return id.startsWith(OVERLAP_SEGMENT_PREFIX) || /^a\d+:ovl-/.test(id);
}

export function firstPassWords(source: Source, span: OverlapSpan, skip?: string): AttributedWord[] {
  const words: AttributedWord[] = [];
  const reach = SAME_PHRASE_SECONDS + 1;
  for (const seg of getState().segments) {
    if (seg.source !== source || !seg.words || seg.id === skip) continue;
    const placed = captureSpanOf(seg);
    if (!placed || placed.end < span.start - reach || placed.start > span.end + reach) continue;
    const offset = seg.start - placed.start;
    for (const w of seg.words) words.push({ text: w.text, start: w.start - offset, end: w.end - offset, speaker: seg.speaker });
  }
  return words;
}

export function pruneDuplicatedPassWords(source: Source): void {
  for (const seg of getState().segments) {
    if (seg.source !== source || !isOverlapPassSegment(seg.id) || !seg.overlap || !seg.words?.length) continue;
    const placed = captureSpanOf(seg);
    if (!placed) continue;
    const offset = seg.start - placed.start;
    const words = seg.words.map((w) => ({ ...w, start: w.start - offset, end: w.end - offset }));
    const kept = missedWords(firstPassWords(source, seg.overlap, seg.id), words, seg.overlap);
    if (kept.length === words.length) continue;
    if (kept.length === 0) {
      setState({ segments: getState().segments.filter((s) => s.id !== seg.id) });
      continue;
    }
    const placedWords = kept.map(({ text, start, end }) => ({ text, start: start + offset, end: end + offset }));
    upsertSegment({
      ...seg,
      text: placedWords.map((w) => w.text).join(' '),
      start: placedWords[0].start,
      end: placedWords[placedWords.length - 1].end,
      words: placedWords,
    });
  }
}
