import { describe, expect, it } from 'vitest';
import { NEMOTRON } from './nemotron-constants';
import { NemotronMelStream } from './nemotron-mel-stream';
import { chunkSamples } from './nemotron-test-fakes';

describe('NemotronMelStream', () => {
  it('turns one 560 ms chunk into 56 frames of 128 mels', () => {
    const { mel, frames } = new NemotronMelStream().process(new Float32Array(chunkSamples));
    expect(frames).toBe(56);
    expect(mel.length).toBe(56 * 128);

    expect(mel[0]).toBeCloseTo(Math.log(NEMOTRON.logEps), 5);
  });

  it('puts a 1 kHz tone in the mel bin that covers 1 kHz, in every chunk', () => {
    const stream = new NemotronMelStream();
    for (let c = 0; c < 2; c++) {
      const chunk = new Float32Array(chunkSamples);
      for (let i = 0; i < chunk.length; i++) chunk[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * (c * chunkSamples + i)) / 16000);
      const { mel } = stream.process(chunk);
      const frame = mel.subarray(30 * 128, 31 * 128);
      const peak = frame.indexOf(Math.max(...frame));

      expect(peak).toBeGreaterThanOrEqual(40);
      expect(peak).toBeLessThanOrEqual(44);
    }
  });
});
