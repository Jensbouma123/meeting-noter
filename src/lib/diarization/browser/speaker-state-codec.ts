const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

function toHalf(value: number): number {
  f32[0] = value;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const rawExp = (x >>> 23) & 0xff;
  const mant = x & 0x7fffff;
  if (rawExp === 0xff) return sign | (mant ? 0x7e00 : 0x7c00);
  const exp = rawExp - 127 + 15;
  if (exp >= 31) return sign | 0x7c00;
  if (exp <= 0) {
    if (exp < -10) return sign;
    return sign | (((mant | 0x800000) >> (1 - exp)) + 0x1000) >> 13;
  }
  return (sign | (exp << 10) | (mant >> 13)) + ((mant >> 12) & 1);
}

function fromHalf(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0) return sign * mant * 2 ** -24;
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * 2 ** (exp - 15);
}

export function encodeHalfFloatsBase64(values: Float32Array): string {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < values.length; i += 1) view.setUint16(i * 2, toHalf(values[i]), true);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function decodeHalfFloatsBase64(text: string, length: number): Float32Array | null {
  let binary: string;
  try {
    binary = atob(text);
  } catch {
    return null;
  }
  if (binary.length !== length * 2) return null;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = fromHalf(binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
  }
  return out;
}
