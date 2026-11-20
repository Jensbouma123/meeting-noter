import { splitTranscript } from '@/lib/meeting/split-transcript';
import type { Segment } from '@/lib/meeting/types';
import type { MeetingSegment } from '../types/meeting-result';

export function meetingSegments(all: Segment[], diarized: boolean): MeetingSegment[] {
  const blocks = new Map<string, { block: number; blockKind: 'turn' | 'overlap' }>();
  splitTranscript(all).forEach((b, block) => b.segments.forEach((s) => blocks.set(s.id, { block, blockKind: b.kind })));
  return all.map((s) => {
    const row: MeetingSegment = {
      source: s.source,
      text: s.text,
      start: +s.start.toFixed(2),
      end: +s.end.toFixed(2),
      kept: blocks.has(s.id),
    };
    if (!diarized) return row;
    return { ...row, label: s.speaker, overlap: !!s.overlap, ...blocks.get(s.id) };
  });
}
