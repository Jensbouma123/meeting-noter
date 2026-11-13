import { crossMarks, crossSourceOverlaps } from './cross-source-overlaps';
import { everyColumnHolds } from './overlap-columns';
import { splitTurns } from './transcript-turns';
import type { Segment } from './types';
import type { TranscriptBlock } from './types/export';

const OVERLAP_JOIN_SECONDS = 0.05;

function withoutOverlap<T extends Segment>(seg: T): T {
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

function splitMarked<T extends Segment>(segments: readonly T[]): TranscriptBlock<T>[] {
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  const blocks: TranscriptBlock<T>[] = [];
  let run: T[] = [];
  const flushRun = () => {
    for (const turn of splitTurns(run)) blocks.push({ kind: 'turn', segments: turn });
    run = [];
  };
  for (const seg of ordered) {
    const o = seg.overlap;
    if (!o) {
      run.push(seg);
      continue;
    }
    flushRun();
    const last = blocks[blocks.length - 1];
    if (
      last?.kind === 'overlap' &&
      (crossMarks.has(o)
        ? last.segments.some((other) => other.overlap === o)
        : last.source === seg.source &&
          o.start <= last.end + OVERLAP_JOIN_SECONDS &&
          o.end >= last.start - OVERLAP_JOIN_SECONDS)
    ) {
      last.segments.push(seg);
      last.start = Math.min(last.start, o.start);
      last.end = Math.max(last.end, o.end);
      for (const id of o.speakers) if (!last.speakers.includes(id)) last.speakers.push(id);
    } else {
      blocks.push({ kind: 'overlap', start: o.start, end: o.end, source: seg.source, speakers: [...o.speakers], segments: [seg] });
    }
  }
  flushRun();
  for (const block of blocks) {
    if (block.kind !== 'overlap') continue;
    const speaking = [...new Set(block.segments.map((seg) => seg.speaker))];
    block.speakers = [...speaking, ...block.speakers.filter((id) => !speaking.includes(id))];
  }
  return blocks;
}

export function splitTranscript<T extends Segment>(segments: readonly T[]): TranscriptBlock<T>[] {
  const thin = new Set<T>();
  for (const block of splitMarked(segments)) {
    if (block.kind !== 'overlap' || everyColumnHolds(block.segments)) continue;
    for (const seg of block.segments) thin.add(seg);
  }
  const kept = thin.size === 0 ? segments : segments.map((seg) => (thin.has(seg) ? withoutOverlap(seg) : seg));
  const cross = crossSourceOverlaps(kept);
  if (thin.size === 0 && cross.size === 0) return splitMarked(segments);
  return splitMarked(kept.map((seg) => {
    const overlap = cross.get(seg);
    return overlap ? { ...seg, overlap } : seg;
  }));
}
