import { describe, expect, it } from 'vitest';
import { Resampler } from './resampler.js';

/**
 * Tones through the capture resampler. The box average it replaced let
 * 9 kHz through to 7 kHz at -4.6 dB, 12 kHz to 4 kHz at -9.5 dB and 20 kHz
 * to 4 kHz at -12.3 dB from 48 kHz input, and drooped -2.6 dB at 7 kHz.
 */

/** Output RMS over input RMS, in dB, for a 0.5-amplitude sine at `hz`. */
export function toneGainDb(inputRate, hz) {
  const resampler = new Resampler(inputRate);
  const out = [];
  const n = inputRate; // 1 s
  for (let i = 0; i < n; i++) resampler.push(0.5 * Math.sin((2 * Math.PI * hz * i) / inputRate), (y) => out.push(y));
  const settled = out.slice(800); // past the kernel's start-up
  const rms = Math.sqrt(settled.reduce((s, y) => s + y * y, 0) / settled.length);
  return 20 * Math.log10(rms / (0.5 / Math.SQRT2));
}

describe('capture resampler: anti-alias low-pass before 16 kHz', () => {
  for (const rate of [48000, 44100, 96000]) {
    it(`keeps 8–24 kHz out of the 16 kHz output at ${rate} Hz input`, () => {
      for (const hz of [8600, 9000, 10000, 12000, 15000, 20000]) {
        expect(toneGainDb(rate, hz), `${hz} Hz`).toBeLessThan(-60);
      }
    });

    it(`passes speech frequencies intact at ${rate} Hz input`, () => {
      for (const hz of [100, 1000, 3000, 5000, 6000]) {
        expect(Math.abs(toneGainDb(rate, hz)), `${hz} Hz`).toBeLessThan(0.1);
      }
      expect(toneGainDb(rate, 7000), '7000 Hz').toBeGreaterThan(-6);
    });
  }

  it('interpolates an 8 kHz (Bluetooth) mic up to 16 kHz without imaging', () => {
    expect(Math.abs(toneGainDb(8000, 1000))).toBeLessThan(0.1);
    expect(Math.abs(toneGainDb(8000, 3000))).toBeLessThan(0.5);
  });

  it('emits 16 000 samples per second of input at any rate', () => {
    for (const rate of [8000, 24000, 44100, 48000]) {
      const resampler = new Resampler(rate);
      let count = 0;
      for (let i = 0; i < rate * 10; i++) resampler.push(0, () => (count += 1));
      expect(Math.abs(count - 160000), `${rate} Hz`).toBeLessThanOrEqual(1);
    }
  });

  it('passes DC unchanged', () => {
    const resampler = new Resampler(44100);
    const out = [];
    for (let i = 0; i < 4410; i++) resampler.push(0.25, (y) => out.push(y));
    for (const y of out.slice(100)) expect(y).toBeCloseTo(0.25, 6);
  });
});
