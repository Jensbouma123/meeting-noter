import type { Spectrum } from '../types/spectrum';

function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? -2 : 2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i += 1) {
    re[i] /= n;
    im[i] /= n;
  }
}

const nextPow2 = (len: number): number => {
  let n = 1;
  while (n < len) n <<= 1;
  return n;
};

const FULL_FFT_MAX = 1 << 22;
const BLOCK_FFT_MIN = 1 << 16;

function spectrum(x: Float32Array, n: number): Spectrum {
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(x);
  fft(re, im, false);
  return [re, im];
}

function filtered(x: Float32Array, [hr, hi]: Spectrum): Float64Array {
  const [ar, ai] = spectrum(x, hr.length);
  for (let i = 0; i < ar.length; i += 1) {
    const r = ar[i] * hr[i] - ai[i] * hi[i];
    ai[i] = ar[i] * hi[i] + ai[i] * hr[i];
    ar[i] = r;
  }
  fft(ar, ai, true);
  return ar;
}

export function convolveBlocks(x: Float32Array, h: Float32Array): Float32Array {
  const n = Math.max(BLOCK_FFT_MIN, nextPow2(2 * h.length));
  const block = n - h.length + 1;
  const hs = spectrum(h, n);
  const out = new Float32Array(x.length + h.length - 1);
  for (let at = 0; at < x.length; at += block) {
    const y = filtered(x.subarray(at, at + block), hs);
    for (let i = 0; i < n && at + i < out.length; i += 1) out[at + i] += y[i];
  }
  return out;
}

export function convolve(x: Float32Array, h: Float32Array): Float32Array {
  const outLen = x.length + h.length - 1;
  if (outLen > FULL_FFT_MAX) return convolveBlocks(x, h);
  return Float32Array.from(filtered(x, spectrum(h, nextPow2(outLen))).subarray(0, outLen));
}
