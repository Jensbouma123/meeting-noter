import type { Segment } from '@/lib/meeting/types';
import type { Sentence } from './types/sentence';

const BOUNDARY = /(?<=[.!?…])\s+/u;

export function splitSentences(segments: readonly Segment[]): Sentence[] {
  const out: Sentence[] = [];
  for (const seg of segments) {
    if (!seg.final) continue;
    seg.text
      .split(BOUNDARY)
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .forEach((text, n) => {
        out.push({ id: `${seg.id}:${n}`, segmentId: seg.id, speakerId: seg.speaker, start: seg.start, text });
      });
  }
  return out.sort((a, b) => a.start - b.start);
}
