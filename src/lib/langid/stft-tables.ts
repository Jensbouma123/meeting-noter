export function hannWindow(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  }
  return w;
}

export function buildDftTables(nFft: number, nFreqBins: number): { cos: Float64Array; sin: Float64Array } {
  const cos = new Float64Array(nFreqBins * nFft);
  const sin = new Float64Array(nFreqBins * nFft);
  for (let k = 0; k < nFreqBins; k++) {
    for (let n = 0; n < nFft; n++) {
      const angle = (2 * Math.PI * k * n) / nFft;
      cos[k * nFft + n] = Math.cos(angle);
      sin[k * nFft + n] = Math.sin(angle);
    }
  }
  return { cos, sin };
}

export function reflectPad(input: Float32Array, pad: number): Float64Array {
  const n = input.length;
  const out = new Float64Array(n + 2 * pad);
  for (let i = 0; i < pad; i++) {
    out[i] = input[Math.min(pad - i, n - 1)];
    out[pad + n + i] = input[Math.max(n - 2 - i, 0)];
  }
  for (let i = 0; i < n; i++) out[pad + i] = input[i];
  return out;
}
