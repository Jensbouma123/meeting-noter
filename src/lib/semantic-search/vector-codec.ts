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
