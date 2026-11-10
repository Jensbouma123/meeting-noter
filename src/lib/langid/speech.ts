/** How much of a window is actual speech, so language ID is not run on room
 *  noise or silence — Whisper-tiny answers *something* for any input, and on
 *  silence or a second of noise that something is an arbitrary language. */

const FRAME_SAMPLES = 320; // 20 ms at 16 kHz
/** Quietest speech worth identifying (RMS, full scale 1.0 ≈ -54 dBFS). */
const ABSOLUTE_FLOOR_RMS = 0.002;
/** A frame counts as speech when this many times louder than the window's noise floor. */
const NOISE_FLOOR_RATIO = 2.5;

/** Number of samples in 20 ms frames that look like speech: louder than both
 *  an absolute floor and 2.5x the window's own noise floor (its 10th-percentile
 *  frame energy). Stationary noise sits at its own floor and so scores ~0;
 *  speech, with its pauses and peaks, clears it. */
export function countSpeechSamples(pcm: Float32Array): number {
  const frames = Math.floor(pcm.length / FRAME_SAMPLES);
  if (frames === 0) return 0;
  const rms = new Float64Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const base = f * FRAME_SAMPLES;
    for (let i = 0; i < FRAME_SAMPLES; i += 1) sum += pcm[base + i] * pcm[base + i];
    rms[f] = Math.sqrt(sum / FRAME_SAMPLES);
  }
  const noiseFloor = Float64Array.from(rms).sort()[Math.floor(frames * 0.1)];
  const threshold = Math.max(ABSOLUTE_FLOOR_RMS, noiseFloor * NOISE_FLOOR_RATIO);
  let voiced = 0;
  for (let f = 0; f < frames; f += 1) if (rms[f] > threshold) voiced += 1;
  return voiced * FRAME_SAMPLES;
}
