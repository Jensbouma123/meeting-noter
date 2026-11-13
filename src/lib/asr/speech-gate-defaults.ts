import { SPEECH_GATE_SAMPLE_RATE as SR } from './speech-gate-constants';
import type { SpeechGateConfig } from './types';

export const DEFAULT_SPEECH_GATE_CONFIG: Readonly<SpeechGateConfig> = Object.freeze({
  minSpeechRms: 0.001,
  speechOverFloor: 3,
  voicedOverFloor: 2,
  quietOverFloor: 2,
  minVoicing: 0.5,
  minLowBandShare: 0.3,
  minSteadiness: 0.05,
  minSpeechSamples: 0.3 * SR,
  maxSpeechGapSamples: 0.3 * SR,
  minWordConfidence: 0.5,
  minLoneWordConfidence: 0.7,
});
