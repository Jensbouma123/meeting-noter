import type { SeparateClip, TimedWord } from './overlap-retranscribe';

export type SeparatorBackend = 'unloaded' | 'webgpu' | 'wasm' | 'failed';

export type SeparationSkip = 'source' | 'short' | 'speakers' | 'backend' | 'busy' | 'rate';

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
