import type { SegmentOverlap, Source } from '../types';
import type { EchoVerdict } from './echo-verdict';

export type SpeakerAt = (start: number, end: number) => string | null;

export type EchoAt = (start: number, end: number) => EchoVerdict | undefined;

export type OverlapAt = (start: number, end: number) => SegmentOverlap[];

export type OverlapTimeline = (source: Source, start: number, end: number) => SegmentOverlap[];

export interface SpeakerRun {
  from: number;
  to: number;
  speaker: string;
  reached: boolean;
  overlap?: SegmentOverlap;
}
