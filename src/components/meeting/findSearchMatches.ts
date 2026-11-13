import type { Segment } from '@/lib/meeting';
import type { SearchMatch } from './TranscriptSearch.types';

export function findMatches(segments: Segment[], query: string): SearchMatch[] {
  const q = query.toLowerCase();
  if (q.length === 0) return [];
  const out: SearchMatch[] = [];
  for (const seg of segments) {
    const text = seg.text.toLowerCase();
    let from = 0;
    while (from <= text.length) {
      const i = text.indexOf(q, from);
      if (i === -1) break;
      out.push({ segId: seg.id, start: i, end: i + q.length });
      from = i + Math.max(1, q.length);
    }
  }
  return out;
}
