export interface SpeechGateConfig {
  minSpeechRms: number;
  speechOverFloor: number;
  voicedOverFloor: number;
  quietOverFloor: number;
  minVoicing: number;
  minLowBandShare: number;
  minSteadiness: number;
  minSpeechSamples: number;
  maxSpeechGapSamples: number;
  minWordConfidence: number;
  minLoneWordConfidence: number;
}
