import type { Segment } from '@/lib/meeting';
import { splitTranscript } from '@/lib/meeting/split-transcript';
import type { TranscriptItem, TranscriptLine, TranscriptOverlap } from './LiveTranscript.types';

export const ACTIVE_TURN_CLASS = 'mn-search-active-turn';
export const SEG_SELECTOR = /^\[data-seg-id="(.*)"\]$/;
export const LIVE_EDGE_PX = 80;

export const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;

const lineHeight = (text: string, charsPerLine = 70) => Math.max(1, Math.ceil(text.length / charsPerLine)) * 26;

const HEADER_HEIGHT = 28;

function estimateRowHeight(item: TranscriptItem): number {
  if (item.kind === 'line') return lineHeight(item.seg.text) + (item.turnStart ? HEADER_HEIGHT + 20 : 4);
  const text = item.columns.reduce((h, c) => c.segs.reduce((sum, seg) => sum + lineHeight(seg.text), h), 0);
  return text + item.columns.length * (HEADER_HEIGHT + 12) + 20;
}

export const estimateItemHeight = (_index: number, item: TranscriptItem) => estimateRowHeight(item);

export const itemKey = (item: TranscriptItem) => (item.kind === 'line' ? item.seg.id : `overlap:${item.id}`);

export const itemSegments = (item: TranscriptItem): Segment[] =>
  item.kind === 'line' ? [item.seg] : item.columns.flatMap((c) => c.segs);

function overlapItem(segments: Segment[], speakers: string[]): TranscriptOverlap {
  return {
    kind: 'overlap',
    id: segments[0].id,
    start: segments[0].start,
    columns: speakers
      .map((speaker) => ({ speaker, segs: segments.filter((seg) => seg.speaker === speaker) }))
      .filter((column) => column.segs.length > 0),
  };
}

export function buildTranscriptItems(segments: Segment[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const block of splitTranscript(segments)) {
    if (block.kind !== 'turn') {
      items.push(overlapItem(block.segments, block.speakers));
      continue;
    }
    const prev = items[items.length - 1];
    const sameSpeaker = prev?.kind === 'line' && prev.seg.speaker === block.segments[0].speaker;
    block.segments.forEach((seg, i) => {
      const line: TranscriptLine = { kind: 'line', seg, turnStart: i === 0 && !sameSpeaker, showTime: i === 0 };
      items.push(line);
    });
  }
  return items;
}
