export const CAPTURE_SAMPLE_RATE = 16_000;

export function int16ToFloat32(pcm: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(pcm, 0, pcm.byteLength >> 1);
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) out[i] = int16[i] / 32768;
  return out;
}
