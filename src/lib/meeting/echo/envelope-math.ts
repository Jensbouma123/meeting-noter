import type { EchoFrames } from '../types/echo-frames';

export function band(frames: EchoFrames, b: number, from = 0, to = frames.frames): Float64Array {
  const out = new Float64Array(Math.max(0, to - from));
  for (let t = from; t < to; t += 1) out[t - from] = frames.power[t * frames.bands + b];
  return out;
}

export function percentile(values: ArrayLike<number>, p: number): number {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function decay(power: Float64Array, ms: number, frameMs: number): Float64Array {
  if (ms <= 0) return power;
  const a = Math.exp(-frameMs / ms);
  const out = new Float64Array(power.length);
  let y = 0;
  for (let t = 0; t < power.length; t += 1) {
    y = power[t] + a * y;
    out[t] = y * (1 - a);
  }
  return out;
}

export function amplitude(power: Float64Array): Float64Array {
  const out = new Float64Array(power.length);
  for (let t = 0; t < power.length; t += 1) {
    const prev = power[Math.max(0, t - 1)];
    const next = power[Math.min(power.length - 1, t + 1)];
    out[t] = Math.sqrt((prev + power[t] + next) / 3);
  }
  return out;
}

export function pearson(x: Float64Array, xOffset: number, y: Float64Array, n: number): number {
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let t = 0; t < n; t += 1) {
    const a = x[xOffset + t];
    const b = y[t];
    sx += a;
    sy += b;
    sxx += a * a;
    syy += b * b;
    sxy += a * b;
  }
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  if (vx <= 1e-20 || vy <= 1e-20) return 0;
  return (sxy - (sx * sy) / n) / Math.sqrt(vx * vy);
}

export function stdev(x: Float64Array): number {
  let s = 0;
  let ss = 0;
  for (const v of x) {
    s += v;
    ss += v * v;
  }
  const n = Math.max(1, x.length);
  return Math.sqrt(Math.max(0, ss / n - (s / n) ** 2));
}
