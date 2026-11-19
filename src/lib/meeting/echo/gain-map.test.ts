import { describe, expect, it } from 'vitest';
import { predictEcho } from './gain-map';

const frames = 400;
const sys = Float64Array.from({ length: frames }, (_, t) => 10 ** (-2 + (2 * ((t * 37) % frames)) / frames));
const compressed = sys.map((x) => 0.01 * x ** 0.25);

const worstRatio = (mic: Float64Array, predicted: Float64Array): number =>
  Math.max(...Array.from(mic, (m, t) => m / Math.max(1e-20, predicted[t])));

describe('predictEcho', () => {
  it('follows a compressive level map that a single gain cannot', () => {
    expect(worstRatio(compressed, predictEcho(compressed, sys, 0, 0.5, 1))).toBeGreaterThan(4);
    expect(worstRatio(compressed, predictEcho(compressed, sys, 0, 0.5, 8))).toBeLessThan(4);
  });

  it('predicts a level that never falls as the system gets louder', () => {
    const predicted = predictEcho(compressed, sys, 0, 0.5, 8);
    const order = Array.from(sys.keys()).sort((a, b) => sys[a] - sys[b]);
    for (let i = 1; i < order.length; i += 1) expect(predicted[order[i]]).toBeGreaterThanOrEqual(predicted[order[i - 1]] * 0.999);
  });

  it('keeps near-end speech above the prediction when it fills a minority of frames', () => {
    const mic = compressed.map((m, t) => (t % 5 === 0 ? m * 30 : m));
    const predicted = predictEcho(mic, sys, 0, 0.5, 8);
    const loud = Array.from(mic.keys()).filter((t) => t % 5 === 0 && mic[t] > 4 * predicted[t]);
    expect(loud.length).toBeGreaterThan(0.9 * (frames / 5));
  });

  it('predicts nothing when the system is silent', () => {
    expect(predictEcho(compressed, new Float64Array(frames), 0, 0.5, 8).every((v) => v === 0)).toBe(true);
  });
});
