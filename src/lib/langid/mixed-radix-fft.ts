export class MixedRadixFft {
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly tmpRe: Float64Array;
  private readonly tmpIm: Float64Array;
  private readonly maxRadix: number;

  constructor(readonly size: number) {
    this.cos = new Float64Array(size);
    this.sin = new Float64Array(size);
    for (let j = 0; j < size; j++) {
      this.cos[j] = Math.cos((2 * Math.PI * j) / size);
      this.sin[j] = Math.sin((2 * Math.PI * j) / size);
    }
    let maxRadix = 1;
    for (let n = size; n > 1; ) {
      const p = smallestFactor(n);
      maxRadix = Math.max(maxRadix, p);
      n /= p;
    }
    this.maxRadix = maxRadix;
    this.tmpRe = new Float64Array(maxRadix);
    this.tmpIm = new Float64Array(maxRadix);
  }

  transform(inRe: Float64Array, inIm: Float64Array, outRe: Float64Array, outIm: Float64Array): void {
    this.rec(inRe, inIm, 0, 1, outRe, outIm, 0, this.size);
  }

  private rec(
    inRe: Float64Array,
    inIm: Float64Array,
    inOff: number,
    inStride: number,
    outRe: Float64Array,
    outIm: Float64Array,
    outOff: number,
    n: number,
  ): void {
    if (n === 1) {
      outRe[outOff] = inRe[inOff];
      outIm[outOff] = inIm[inOff];
      return;
    }
    const p = smallestFactor(n);
    const m = n / p;
    for (let r = 0; r < p; r++) {
      this.rec(inRe, inIm, inOff + r * inStride, inStride * p, outRe, outIm, outOff + r * m, m);
    }
    const step = this.size / n;
    const { cos, sin, tmpRe, tmpIm, size } = this;
    for (let k = 0; k < m; k++) {
      for (let r = 0; r < p; r++) {
        const idx = outOff + r * m + k;
        const j = (step * r * k) % size;
        const c = cos[j];
        const s = sin[j];
        tmpRe[r] = outRe[idx] * c + outIm[idx] * s;
        tmpIm[r] = outIm[idx] * c - outRe[idx] * s;
      }
      for (let q = 0; q < p; q++) {
        let re = 0;
        let im = 0;
        for (let r = 0; r < p; r++) {
          const j = (((this.size / p) * ((r * q) % p)) % size);
          const c = cos[j];
          const s = sin[j];
          re += tmpRe[r] * c + tmpIm[r] * s;
          im += tmpIm[r] * c - tmpRe[r] * s;
        }
        outRe[outOff + q * m + k] = re;
        outIm[outOff + q * m + k] = im;
      }
    }
  }
}

function smallestFactor(n: number): number {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}
