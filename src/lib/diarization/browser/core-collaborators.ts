import {
  DEFAULT_MAX_GAP_SEC,
  DEFAULT_OFF_THRESHOLD,
  DEFAULT_ON_THRESHOLD,
  DEFAULT_OVERLAP_THRESHOLD,
  DEFAULT_PAUSE_SEC,
} from './constants';
import { FRAME_SEC, HIDDEN_SIZE, NUM_SPEAKERS, SUBSAMPLING_FACTOR } from './manifest';
import { SpeakerCache } from './speaker-cache';
import { TurnTracker } from './turns';
import type { DiarizerCoreOptions, StreamingMode } from './types';

export function createDiarizerCache(mode: StreamingMode, options: DiarizerCoreOptions): SpeakerCache {
  const cache = new SpeakerCache({
    fifoLength: mode.fifoLength,
    updatePeriod: mode.updatePeriod,
    numSpeakers: NUM_SPEAKERS,
    hiddenSize: HIDDEN_SIZE,
    subsamplingFactor: SUBSAMPLING_FACTOR,
    ...options.cache,
  });
  if (options.speakerState) cache.restore(options.speakerState);
  return cache;
}

export function createDiarizerTracker(options: DiarizerCoreOptions): TurnTracker {
  return new TurnTracker({
    numSpeakers: NUM_SPEAKERS,
    frameSec: FRAME_SEC,
    threshold: DEFAULT_ON_THRESHOLD,
    overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
    offThreshold: DEFAULT_OFF_THRESHOLD,
    maxGapSec: DEFAULT_MAX_GAP_SEC,
    pauseSec: DEFAULT_PAUSE_SEC,
    ...options.turns,
  });
}
