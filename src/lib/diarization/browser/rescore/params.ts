// Frozen Method B parameters, tuned on VoxConverse dev (exchange/diar16/results.md).
export const RESCORE_PARAMS = Object.freeze({
  tau: 0.35,
  minWindows: 3,
  maxClusters: 16,
  windowFrames: 150,
  hopFrames: 75,
  minRunFrames: 50,
  batch: 8,
  gateSpeakers: 7,
});

export const HOP_SAMPLES = 160;
export const WINDOW_TAIL_SAMPLES = 240;
export const EMBEDDING_SIZE = 256;
