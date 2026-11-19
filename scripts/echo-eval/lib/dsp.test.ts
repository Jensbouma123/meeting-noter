import { describe, expect, it } from 'vitest';
import { activity, aecResidual, duckNear } from './aec-residual';
import { resampleDrift } from './drift';
import { clip, compress } from './loudspeaker';
import { makeRng } from './rng';

const SR = 16_000;
const tone = (seconds: number, amp = 0.5, hz = 220): Float32Array =>
  Float32Array.from({ length: seconds * SR }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const rms = (x: Float32Array): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);

describe('loudspeaker chain', () => {
  it('clipping flattens peaks and raises the crest-free level', () => {
    const x = tone(1);
    const y = clip(x, 6);
    expect(Math.max(...y)).toBeLessThanOrEqual(1);
    expect(rms(y)).toBeGreaterThan(rms(x) * 1.2);
    expect(rms(y.map((v, i) => v - x[i] * (rms(y) / rms(x))))).toBeGreaterThan(0.05);
  });

  it('compression pulls a loud passage toward a quiet one', () => {
    const x = Float32Array.from([...tone(1, 0.05), ...tone(1, 0.8)]);
    const y = compress(x, -30, 8);
    const before = rms(x.slice(SR + 4000)) / rms(x.slice(4000, SR));
    const after = rms(y.slice(SR + 4000)) / rms(y.slice(4000, SR));
    expect(after).toBeLessThan(before / 2);
  });
});

describe('clock drift', () => {
  it('+100 ppm shifts a late sample by about 1 ms per 10 s', () => {
    const n = 10 * SR;
    const x = Float32Array.from({ length: n }, (_, i) => (i === n - 400 ? 1 : 0));
    const y = resampleDrift(x, 100);
    const peak = y.reduce((best, v, i) => (v > y[best] ? i : best), 0);
    expect(n - 400 - peak).toBeGreaterThanOrEqual(15);
    expect(n - 400 - peak).toBeLessThanOrEqual(17);
    expect(resampleDrift(x, 0)[n - 400]).toBe(1);
  });
});

describe('AEC residual', () => {
  it('attenuates the bleed by roughly the requested amount and modulates it', () => {
    const x = tone(3);
    const y = aecResidual(x, 20, makeRng(3));
    expect(rms(y) / rms(x)).toBeLessThan(0.15);
    const blocks = [0, 1, 2, 3].map((k) => rms(y.slice(k * 4000, (k + 1) * 4000)));
    expect(Math.max(...blocks) / Math.min(...blocks)).toBeGreaterThan(1.05);
  });

  it('ducks near-end speech only while the system is active', () => {
    const system = Float32Array.from([...tone(1, 0.3), ...new Float32Array(SR * 2)]);
    const near = tone(3, 0.3);
    const y = duckNear(near, 0, activity(system), 6);
    expect(rms(y.slice(4000, 12_000)) / rms(near.slice(4000, 12_000))).toBeLessThan(0.6);
    expect(rms(y.slice(SR * 2))).toBeCloseTo(rms(near.slice(SR * 2)), 3);
  });
});
