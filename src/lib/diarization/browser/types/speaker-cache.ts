export interface SpeakerCacheConfig {
  fifoLength: number;
  cacheLength: number;
  updatePeriod: number;
  numSpeakers: number;
  hiddenSize: number;
  subsamplingFactor: number;
  silenceFramesPerSpeaker: number;
  predictionScoreThreshold: number;
  latestFramesScoreBoost: number;
  minPositiveScoresRate: number;
  strongBoostRate: number;
  weakBoostRate: number;
}

export interface SpeakerCacheSnapshot {
  numFrames: number;
  compressed: boolean;
  embeds: Float32Array;
  probs: Float32Array;
}

export interface CompressedFrames {
  embeds: Float32Array;
  probs: Float32Array;
}

export interface CompressionBudget {
  minPositiveScores: number;
  numStrongBoosted: number;
  numWeakBoosted: number;
}
