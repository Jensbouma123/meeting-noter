import { micEchoVerdict } from './echo/segment-echo';
import { OVERLAP_SEGMENT_PREFIX } from './overlap-pass-segments';
import { upsertSegment } from './segment-store';
import type { Source } from './types';
import type { AttributedWord, OverlapSpan } from './types/overlap-retranscribe';

let segmentCounter = 0;

export function upsertPassSegment(source: Source, span: OverlapSpan, words: readonly AttributedWord[]): void {
  if (words.length === 0) return;
  const start = words[0].start;
  const end = words[words.length - 1].end;
  const echo = source === 'mic' ? micEchoVerdict(start, end) : undefined;
  upsertSegment({
    id: `${OVERLAP_SEGMENT_PREFIX}${++segmentCounter}`,
    source,
    speaker: words[0].speaker,
    text: words.map((w) => w.text).join(' '),
    start,
    end,
    final: true,
    words: words.map(({ text, start, end }) => ({ text, start, end })),
    overlap: span,
    ...(echo ? { echo } : {}),
  });
}

export function upsertSpeakerSegments(source: Source, span: OverlapSpan, words: readonly AttributedWord[]): void {
  const bySpeaker = new Map<string, AttributedWord[]>();
  for (const w of words) bySpeaker.set(w.speaker, [...(bySpeaker.get(w.speaker) ?? []), w]);
  for (const group of bySpeaker.values()) upsertPassSegment(source, span, group);
}
