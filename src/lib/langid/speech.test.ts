import { describe, expect, it } from 'vitest';
import { countSpeechSamples } from './speech';

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}

describe('countSpeechSamples', () => {
  it('counts nothing for silence or an empty window', () => {
    expect(countSpeechSamples(new Float32Array(0))).toBe(0);
    expect(countSpeechSamples(new Float32Array(80_000))).toBe(0);
  });

  it('counts nothing for stationary room noise', () => {
    const rnd = lcg(1);
    const noise = Float32Array.from({ length: 80_000 }, () => rnd() * 0.02);
    expect(countSpeechSamples(noise)).toBe(0);
  });

  it('counts a loud burst over a quiet floor, and only that burst', () => {
    const rnd = lcg(2);
    const pcm = Float32Array.from({ length: 160_000 }, () => rnd() * 0.004);
    for (let i = 40_000; i < 88_000; i += 1) pcm[i] = Math.sin(i * 0.3) * 0.2;
    const speech = countSpeechSamples(pcm);
    expect(speech).toBeGreaterThan(45_000);
    expect(speech).toBeLessThanOrEqual(48_640);
  });
});
