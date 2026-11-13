function bitReverseIndices(n: number): Uint32Array {
  const bits = Math.log2(n);
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let rev = 0;
    let v = i;
    for (let b = 0; b < bits; b++) {
      rev = (rev << 1) | (v & 1);
      v >>= 1;
    }
    out[i] = rev;
  }
  return out;
}

export function fftReal(real: Float64Array): { re: Float64Array; im: Float64Array } {
  const n = real.length;
  if (n <= 1 || (n & (n - 1)) !== 0) {
    throw new Error(`fftReal: length must be a power of two >= 2, got ${n}`);
  }

  const rev = bitReverseIndices(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[rev[i]] = real[i];

  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const angle = angleStep * k;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const evenIdx = start + k;
        const oddIdx = start + k + half;
        const oddRe = re[oddIdx] * cos - im[oddIdx] * sin;
        const oddIm = re[oddIdx] * sin + im[oddIdx] * cos;
        re[oddIdx] = re[evenIdx] - oddRe;
        im[oddIdx] = im[evenIdx] - oddIm;
        re[evenIdx] = re[evenIdx] + oddRe;
        im[evenIdx] = im[evenIdx] + oddIm;
      }
    }
  }
  return { re, im };
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
