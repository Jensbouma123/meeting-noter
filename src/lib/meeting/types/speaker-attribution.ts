import type { SegmentOverlap, Source } from '../types';

export type SpeakerAt = (start: number, end: number) => string | null;

export type OverlapAt = (start: number, end: number) => SegmentOverlap[];

export type OverlapTimeline = (source: Source, start: number, end: number) => SegmentOverlap[];

export interface SpeakerRun {
  from: number;
  to: number;
  speaker: string;
  reached: boolean;
  overlap?: SegmentOverlap;
}
