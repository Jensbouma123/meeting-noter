import { LANGID_N_SAMPLES } from './manifest';
import { SampleRing } from './ring-buffer';
import type { SourceState } from './types';

export const RECHECK_INTERVAL_SAMPLES = 20 * 16_000;
export const MIN_SAMPLES_BEFORE_FIRST_RUN = 5 * 16_000;
export const RETRY_AFTER_SILENCE_SAMPLES = 5 * 16_000;

export function createSourceState(): SourceState {
  return {
    window: new SampleRing(LANGID_N_SAMPLES),
    samplesSinceLastRun: 0,
    hasRunOnce: false,
    recheckAfterSamples: RECHECK_INTERVAL_SAMPLES,
    running: false,
  };
}
