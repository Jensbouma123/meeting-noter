/** Capture frames are 16 kHz mono Int16LE PCM (see `public/worklets/pcm16.js`). */
export const CAPTURE_SAMPLE_RATE = 16_000;

/**
 * Int16 PCM (what the capture worklet posts) to the [-1, 1] Float32 every
 * model in this app expects. Always a fresh buffer, so the result can be
 * transferred to a worker without detaching the caller's frame.
 *
 * `new Float32Array(buffer)` is not a conversion: it reinterprets each pair
 * of Int16 samples as one float32, which yields half as many samples of
 * noise, NaN and ±1e38 values.
 */
export function int16ToFloat32(pcm: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(pcm, 0, pcm.byteLength >> 1);
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) out[i] = int16[i] / 32768;
  return out;
}
