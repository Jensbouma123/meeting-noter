import { DEFAULT_SPEECH_GATE_CONFIG } from './speech-gate-defaults';
import type { LiveChunkerConfig } from './types';

export const LIVE_SAMPLE_RATE = 16_000;

const SR = LIVE_SAMPLE_RATE;

export const CUT_ECHO_SAMPLES = 0.3 * SR;

export const DEFAULT_LIVE_CHUNKER_CONFIG: Readonly<LiveChunkerConfig> = Object.freeze({
  stepSamples: 1.5 * SR,
  firstStepSamples: 0.2 * SR,
  earlyTailSamples: 0.25 * SR,
  trimAfterSamples: 6 * SR,
  maxWindowSamples: 10 * SR,
  keepTailSamples: 1.5 * SR,
  pauseSamples: 0.6 * SR,
  leadInSamples: 0.3 * SR,
  maxSegmentSamples: 20 * SR,
  pauseWhenUnvoiced: true,
  ...DEFAULT_SPEECH_GATE_CONFIG,
});
