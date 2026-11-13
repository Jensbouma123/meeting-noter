import { describe, expect, it, vi } from 'vitest';
import { computeLogMelSpectrogram } from './mel';
import { LANGID_N_MELS, LANGID_N_FRAMES, LANGID_N_SAMPLES } from './manifest';

vi.setConfig({ testTimeout: 20_000 });

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
