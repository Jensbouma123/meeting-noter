import { describe, expect, it } from 'vitest';
import { OVERLAP_CLIP_MAX_SECONDS } from '@/lib/meeting/asr/constants';
import { SEPARATOR_EDGE, validLength } from './mossformer2-io';

const SAMPLE_RATE = 16_000;
const ENCODER_HOP = 8;
const TO_HIDDEN_CHANNELS = 2048;
const FLOAT32_BYTES = 4;
const DEFAULT_MAX_STORAGE_BUFFER_BINDING_SIZE = 128 * 1024 * 1024;

const largestActivationBytes = (samples: number): number =>
  ((validLength(samples) - SEPARATOR_EDGE) / ENCODER_HOP) * TO_HIDDEN_CHANNELS * FLOAT32_BYTES;

describe('MossFormer2 on default WebGPU limits (Chrome and Safari)', () => {
  it('keeps the to_hidden activation of the longest gated clip within one default storage binding', () => {
    const bytes = largestActivationBytes(OVERLAP_CLIP_MAX_SECONDS * SAMPLE_RATE);

    expect(bytes).toBe(132_120_576);
    expect(bytes).toBeLessThanOrEqual(DEFAULT_MAX_STORAGE_BUFFER_BINDING_SIZE);
  });

  it('would overflow the default binding a little past the current clip cap', () => {
    expect(largestActivationBytes(8.25 * SAMPLE_RATE)).toBeGreaterThan(DEFAULT_MAX_STORAGE_BUFFER_BINDING_SIZE);
  });
});
