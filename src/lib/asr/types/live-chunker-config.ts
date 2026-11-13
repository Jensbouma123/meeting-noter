import type { SpeechGateConfig } from './speech-gate-config';

export interface LiveChunkerConfig extends SpeechGateConfig {
  stepSamples: number;
  firstStepSamples: number;
  earlyTailSamples: number;
  trimAfterSamples: number;
  maxWindowSamples: number;
  keepTailSamples: number;
  pauseSamples: number;
  leadInSamples: number;
  maxSegmentSamples: number;
  pauseWhenUnvoiced: boolean;
}
