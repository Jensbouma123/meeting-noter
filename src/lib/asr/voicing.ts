import { MAX_PITCH_LAG, MIN_PITCH_LAG, STEADY_BLOCKS } from './speech-gate-constants';

export function voicing(x: Float32Array): number {
  const n = x.length;
  if (n <= MAX_PITCH_LAG * 2) return 0;
  const energyPrefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) energyPrefix[i + 1] = energyPrefix[i] + x[i] * x[i];
  if (energyPrefix[n] <= 0) return 0;
  let best = 0;
  for (let lag = MIN_PITCH_LAG; lag <= MAX_PITCH_LAG; lag += 1) {
    let dot = 0;
    for (let i = 0; i + lag < n; i += 1) dot += x[i] * x[i + lag];
    if (dot <= 0) continue;
    const norm = Math.sqrt((energyPrefix[n - lag] - energyPrefix[0]) * (energyPrefix[n] - energyPrefix[lag]));
    if (norm > 0 && dot / norm > best) best = dot / norm;
  }
  return best;
}

export function steadiness(x: Float32Array): number {
  const len = Math.floor(x.length / STEADY_BLOCKS);
  let lo = Infinity;
  let hi = 0;
  for (let b = 0; b < STEADY_BLOCKS; b += 1) {
    let e = 0;
    for (let i = b * len; i < (b + 1) * len; i += 1) e += x[i] * x[i];
    lo = Math.min(lo, e);
    hi = Math.max(hi, e);
  }
  return hi > 0 ? lo / hi : 0;
}
