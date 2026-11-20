import type { SeparateClip, TimedWord } from './overlap-retranscribe';

export type SeparatorBackend = 'unloaded' | 'webgpu' | 'wasm' | 'failed';

export type SeparationSkip = 'source' | 'short' | 'long' | 'speakers' | 'backend' | 'busy' | 'rate';

export type SeparationOutcome = SeparationSkip | 'audio' | 'unmapped' | 'error' | 'separated';

export interface SeparationClipTiming {
  seconds: number;
  ms: number;
  backend: SeparatorBackend;
}

export interface SeparationStats {
  outcomes: Partial<Record<SeparationOutcome, number>>;
  clips: SeparationClipTiming[];
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

export interface GateState {
  running: boolean;
  recent: readonly number[];
}

export interface TrackWords {
  speaker: string;
  track: Float32Array;
  heard: TimedWord[];
}
