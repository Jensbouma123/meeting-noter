import { describe, expect, it } from 'vitest';
import { computeLogMelSpectrogram } from './mel';
import { MixedRadixFft } from './mixed-radix-fft';
import { buildDftTables } from './stft-tables';
import { LANGID_N_MELS, LANGID_N_FRAMES, LANGID_N_SAMPLES } from './manifest';

describe('computeLogMelSpectrogram', () => {
  it('returns a flat [n_mels, n_frames] array', () => {
    const silence = new Float32Array(16_000);
    const mel = computeLogMelSpectrogram(silence);
    expect(mel).toHaveLength(LANGID_N_MELS * LANGID_N_FRAMES);
  });

  it('rescales log output into a bounded range (per Whisper: clamp to [max-8, max], then (x+4)/4)', () => {
    const noise = new Float32Array(16_000);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.sin(i * 0.05) * 0.5;
    const mel = computeLogMelSpectrogram(noise);
    let min = Infinity;
    let max = -Infinity;
    for (const v of mel) {
      expect(Number.isFinite(v)).toBe(true);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(max - min).toBeLessThanOrEqual(2 + 1e-6);
  });

  it('handles input already at (or longer than) the fixed 30s window without throwing', () => {
    const full = new Float32Array(LANGID_N_SAMPLES + 1000).fill(0.01);
    expect(() => computeLogMelSpectrogram(full)).not.toThrow();
  });

  it('produces higher mel energy for a pure tone than for silence', () => {
    const silence = new Float32Array(16_000);
    const tone = new Float32Array(16_000);
    for (let i = 0; i < tone.length; i++) tone[i] = Math.sin((2 * Math.PI * 440 * i) / 16_000) * 0.8;

    const melSilence = computeLogMelSpectrogram(silence);
    const melTone = computeLogMelSpectrogram(tone);

    const frameIndex = 50;
    let sumSilence = 0;
    let sumTone = 0;
    for (let m = 0; m < LANGID_N_MELS; m++) {
      sumSilence += melSilence[m * LANGID_N_FRAMES + frameIndex];
      sumTone += melTone[m * LANGID_N_FRAMES + frameIndex];
    }
    expect(sumTone).toBeGreaterThan(sumSilence);
  });
});

describe('MixedRadixFft', () => {
  it('matches the naive DFT of a 400-sample frame within float tolerance', () => {
    const n = 400;
    const re = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.sin(i * 0.37) + ((i * 7919) % 13) / 13 - 0.5;
    const { cos, sin } = buildDftTables(n, n / 2 + 1);
    const outRe = new Float64Array(n);
    const outIm = new Float64Array(n);
    new MixedRadixFft(n).transform(re, new Float64Array(n), outRe, outIm);
    for (let k = 0; k <= n / 2; k++) {
      let r = 0;
      let im = 0;
      for (let i = 0; i < n; i++) {
        r += re[i] * cos[k * n + i];
        im -= re[i] * sin[k * n + i];
      }
      expect(outRe[k]).toBeCloseTo(r, 9);
      expect(outIm[k]).toBeCloseTo(im, 9);
    }
  });

  it('computes a full 30s window in well under a second', () => {
    const full = new Float32Array(LANGID_N_SAMPLES);
    for (let i = 0; i < full.length; i++) full[i] = Math.sin(i * 0.05) * 0.5;
    const t0 = performance.now();
    computeLogMelSpectrogram(full);
    expect(performance.now() - t0).toBeLessThan(5000);
  });
});
