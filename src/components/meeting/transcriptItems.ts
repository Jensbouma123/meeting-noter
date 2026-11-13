import type { Segment } from '@/lib/meeting';
import { splitTranscript } from '@/lib/meeting/split-transcript';
import type { TranscriptItem, TranscriptLine } from './LiveTranscript.types';

export const ACTIVE_TURN_CLASS = 'mn-search-active-turn';
export const SEG_SELECTOR = /^\[data-seg-id="(.*)"\]$/;
export const LIVE_EDGE_PX = 80;
export const COLUMN_WITHOUT_LINE_RULE = 'sm:[&_.turn-block>div]:border-l-0 sm:[&_.turn-block>div]:pl-0';

export const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;

const lineHeight = (text: string, charsPerLine = 60) =>
  Math.max(1, Math.ceil(text.length / charsPerLine)) * 26;

function estimateRowHeight(item: TranscriptItem): number {
  if (item.kind === 'line') return lineHeight(item.seg.text) + 12;
  const width = 60 / item.columns.length;
  const columns = item.columns.map((c) => c.segs.reduce((h, seg) => h + lineHeight(seg.text, width), 26));
  return Math.max(...columns) + 12;
}

export const estimateItemHeight = (_index: number, item: TranscriptItem) => estimateRowHeight(item);

export const itemKey = (item: TranscriptItem) => (item.kind === 'line' ? item.seg.id : `overlap:${item.id}`);

export const itemSegments = (item: TranscriptItem): Segment[] =>
  item.kind === 'line' ? [item.seg] : item.columns.flatMap((c) => c.segs);

export function buildTranscriptItems(segments: Segment[]): TranscriptItem[] {
  return splitTranscript(segments).flatMap((block): TranscriptItem[] =>
    block.kind === 'turn'
      ? block.segments.map((seg, i): TranscriptLine => ({ kind: 'line', seg, turnStart: i === 0 }))
      : [{
          kind: 'overlap',
          id: block.segments[0].id,
          start: block.segments[0].start,
          columns: block.speakers
            .map((speaker) => ({ speaker, segs: block.segments.filter((seg) => seg.speaker === speaker) }))
            .filter((column) => column.segs.length > 0),
        }],
  );
}

export function turnGridClass(pastHour: boolean): string {
  return `grid items-baseline gap-x-2 sm:gap-x-3 ${
    pastHour
      ? 'grid-cols-[3.75rem_6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_7rem_minmax(0,1fr)]'
      : 'grid-cols-[2.5rem_6rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_7rem_minmax(0,1fr)]'
  }`;
}
