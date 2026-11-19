export function resampleDrift(x: Float32Array, ppm: number): Float32Array {
  const ratio = 1 + ppm * 1e-6;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i += 1) {
    const pos = i * ratio;
    const k = Math.floor(pos);
    const f = pos - k;
    out[i] = k + 1 < x.length ? x[k] * (1 - f) + x[k + 1] * f : 0;
  }
  return out;
}
