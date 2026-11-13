import type { SpeakerCacheConfig, SpeakerCacheSnapshot } from './speaker-cache';
import type { Source } from './source';
import type { TurnTrackerOptions } from './turns';

export interface SortformerOutput {
  logits: Float32Array;
  chunkEmbeds: Float32Array;
  silenceEmbeds: Float32Array;
}

export interface SortformerRunner {
  run(
    features: Float32Array,
    numMelFrames: number,
    cachedEmbeds: Float32Array,
    numCachedFrames: number,
  ): Promise<SortformerOutput>;
}

export interface StreamingMode {
  chunkLength: number;
  rightContext: number;
  fifoLength: number;
  updatePeriod: number;
}

export interface DiarizerCoreOptions {
  source: Source;
  model: SortformerRunner;
  mode?: StreamingMode;
  cache?: Partial<SpeakerCacheConfig>;
  speakerState?: SpeakerCacheSnapshot | null;
  turns?: Partial<Omit<TurnTrackerOptions, 'numSpeakers' | 'frameSec'>>;
  onProbabilities?: (probs: Float32Array, firstFrame: number) => void;
  onStep?: (audioSec: number, inferMs: number) => void;
}
