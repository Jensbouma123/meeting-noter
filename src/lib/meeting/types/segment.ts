import type { Source } from './basics';

export interface SegmentWord {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export type LowConfSpan = [startChar: number, endChar: number, conf: number];

export interface SegmentOverlap {
  start: number;
  end: number;
  speakers: string[];
}

export interface Segment {
  id: string;
  source: Source;
  speaker: string;
  text: string;
  start: number;
  end: number;
  final: boolean;
  words?: SegmentWord[];
  lowConfSpans?: LowConfSpan[];
  unconfirmed?: boolean;
  overlap?: SegmentOverlap;
}

export interface Speaker {
  id: string;
  source: Source;
  label: string;
  colorIndex: number;
}
