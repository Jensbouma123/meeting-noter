import type { AttributedWord, SeparateClip, TimedWord } from './overlap-retranscribe';

export type SeparatorBackend = 'unloaded' | 'webgpu' | 'wasm' | 'failed';

export type SeparationSkip = 'source' | 'short' | 'long' | 'speakers' | 'backend' | 'busy' | 'rate';

export type SeparationOutcome = SeparationSkip | 'audio' | 'unmapped' | 'empty' | 'unchanged' | 'error' | 'separated';

export interface SeparationClipTiming {
  seconds: number;
  ms: number;
  backend: SeparatorBackend;
}

export interface TrackHeard {
  speaker: string;
  words: string;
}

export interface SeparationClipLog {
  start: number;
  end: number;
  speakers: string[];
  outcome: SeparationOutcome;
  margin?: number;
  solo?: [number, number];
  tracks?: TrackHeard[];
  added?: number;
  moved?: number;
}

export interface SeparationStats {
  outcomes: Partial<Record<SeparationOutcome, number>>;
  clips: SeparationClipTiming[];
  log: SeparationClipLog[];
}

export interface SeparatedWords {
  words: AttributedWord[];
  moved: AttributedWord[];
}

export interface OverlapSeparator {
  name: string;
  backend: () => SeparatorBackend;
  separate: SeparateClip;
}

export interface TrackMapping {
  speakers: [string, string];
  margin: number;
}

export interface TrackScore extends TrackMapping {
  solo: [number, number];
}

export interface GateState {
  running: boolean;
  recent: readonly number[];
}

export interface TrackWords {
  speaker: string;
  track: Float32Array;
  heard: TimedWord[];
}
