import { EG2_AUDIO_SAMPLE_RATE, EG2_MAX_AUDIO_SECONDS } from './constants';

export function audioRejection(samples: Float32Array): Error | null {
  if (!(samples instanceof Float32Array)) {
    return new TypeError('EmbeddingGemma2: embedAudio expects a Float32Array');
  }
  if (samples.length === 0) return new RangeError('EmbeddingGemma2: audio is empty');
  const maxSamples = EG2_MAX_AUDIO_SECONDS * EG2_AUDIO_SAMPLE_RATE;
  if (samples.length > maxSamples) {
    return new RangeError(
      `EmbeddingGemma2: audio is ${(samples.length / EG2_AUDIO_SAMPLE_RATE).toFixed(1)} s; max is ${EG2_MAX_AUDIO_SECONDS} s`,
    );
  }
  return null;
}
