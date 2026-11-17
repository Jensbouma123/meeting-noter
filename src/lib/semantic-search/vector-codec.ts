export function encodeVector(v: Float32Array): string {
  let bin = '';
  for (let i = 0; i < v.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
    bin += String.fromCharCode(q & 0xff);
  }
  return btoa(bin);
}

export function decodeVector(s: string): Float32Array {
  const bin = atob(s);
  const out = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = ((bin.charCodeAt(i) << 24) >> 24) / 127;
  return out;
}

export function decodeUnitVector(s: string): Float32Array {
  const bin = atob(s);
  const out = new Float32Array(bin.length);
  let sumSq = 0;
  for (let i = 0; i < bin.length; i++) {
    const q = (bin.charCodeAt(i) << 24) >> 24;
    out[i] = q;
    sumSq += q * q;
  }
  if (sumSq > 0) {
    const scale = 1 / Math.sqrt(sumSq);
    for (let i = 0; i < out.length; i++) out[i] *= scale;
  }
  return out;
}
