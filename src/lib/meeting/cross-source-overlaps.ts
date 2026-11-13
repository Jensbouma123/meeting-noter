import { columnsHold, wordCount } from './overlap-columns';
import type { Segment, SegmentOverlap } from './types';
import type { OverlapColumn } from './types/export';

export const crossMarks = new WeakSet<SegmentOverlap>();

function groupSegmentsAcrossSources<T extends Segment>(ordered: T[]): T[][] {
  const groupOf = ordered.map((_, i) => i);
  const root = (i: number): number => (groupOf[i] === i ? i : (groupOf[i] = root(groupOf[i])));
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length && ordered[j].start < ordered[i].end; j += 1) {
      if (ordered[j].source !== ordered[i].source) groupOf[root(j)] = root(i);
    }
  }
  const groups = new Map<number, T[]>();
  ordered.forEach((seg, i) => {
    const members = groups.get(root(i)) ?? [];
    members.push(seg);
    groups.set(root(i), members);
  });
  return [...groups.values()];
}

function addSharedSpeech(column: OverlapColumn, seg: Segment, others: Segment[]): void {
  const heardOver = (t: number) => others.some((o) => t >= o.start && t < o.end);
  if (seg.words?.length) {
    for (const w of seg.words) {
      if (!heardOver((w.start + w.end) / 2)) continue;
      column.words += 1;
      column.seconds += Math.max(0, w.end - w.start);
    }
    return;
  }
  const shared = others.reduce((m, o) => Math.max(m, Math.min(seg.end, o.end) - Math.max(seg.start, o.start)), 0);
  column.seconds += shared;
  column.words += Math.round(wordCount(seg) * shared / (seg.end - seg.start));
}

function groupColumns<T extends Segment>(members: T[]): Map<string, OverlapColumn> {
  const columns = new Map<string, OverlapColumn>();
  for (const seg of members) {
    const others = members.filter((o) => o.source !== seg.source);
    const column = columns.get(seg.speaker) ?? { words: 0, seconds: 0 };
    addSharedSpeech(column, seg, others);
    columns.set(seg.speaker, column);
  }
  return columns;
}

export function crossSourceOverlaps<T extends Segment>(segments: readonly T[]): Map<T, SegmentOverlap> {
  const ordered = segments.filter((seg) => !seg.overlap && seg.end > seg.start).sort((a, b) => a.start - b.start);
  const marks = new Map<T, SegmentOverlap>();
  if (!ordered.some((seg) => seg.source !== ordered[0].source)) return marks;

  for (const members of groupSegmentsAcrossSources(ordered)) {
    if (members.length < 2) continue;
    if (!columnsHold(groupColumns(members))) continue;
    const overlap: SegmentOverlap = {
      start: members[0].start,
      end: members.reduce((m, seg) => Math.max(m, seg.end), members[0].end),
      speakers: [...new Set(members.map((seg) => seg.speaker))],
    };
    crossMarks.add(overlap);
    for (const seg of members) marks.set(seg, overlap);
  }
  return marks;
}
