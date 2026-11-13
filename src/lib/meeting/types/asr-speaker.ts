import type { Source } from './basics';

export type SpeakerLabeler = (source: Source, audio: Float32Array) => string;

export interface SpeakerTimeline {
  speakerFor(source: Source, start: number, end: number): string | null;
  speakerNear(source: Source, start: number, end: number): string | null;
  changePoints(source: Source, start: number, end: number): number[];
  turnEnds(source: Source, start: number, end: number): number[];
}
