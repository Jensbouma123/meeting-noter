import type { SpeakerCacheConfig, StreamingMode } from './types';

export const DEFAULT_SPEAKER_CACHE_CONFIG: SpeakerCacheConfig = Object.freeze({
  fifoLength: 264,
  cacheLength: 264,
  updatePeriod: 222,
  numSpeakers: 8,
  hiddenSize: 512,
  subsamplingFactor: 8,
  silenceFramesPerSpeaker: 1,
  predictionScoreThreshold: 0.25,
  latestFramesScoreBoost: 0.05,
  minPositiveScoresRate: 0.5,
  strongBoostRate: 0.75,
  weakBoostRate: 1.5,
});

export const LOW_LATENCY_MODE: StreamingMode = Object.freeze({
  chunkLength: 9,
  rightContext: 4,
  fifoLength: 264,
  updatePeriod: 222,
});

export const DEFAULT_MODE: StreamingMode = Object.freeze({
  chunkLength: 50,
  rightContext: 8,
  fifoLength: 188,
  updatePeriod: 144,
});

export const REALTIME_MODE: StreamingMode = Object.freeze({
  chunkLength: 25,
  rightContext: 8,
  fifoLength: 188,
  updatePeriod: 144,
});

export const DEFAULT_ON_THRESHOLD = 0.55;
export const DEFAULT_OVERLAP_THRESHOLD = 0.4;
export const DEFAULT_OFF_THRESHOLD = 0.1;
export const DEFAULT_MAX_GAP_SEC = 1.1;

export const MAX_PENDING_SAMPLES = 30 * 16_000;
