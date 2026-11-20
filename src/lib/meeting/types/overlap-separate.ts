import type { SeparateClip } from './overlap-retranscribe';

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
