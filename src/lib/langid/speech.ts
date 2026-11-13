const FRAME_SAMPLES = 320;
const ABSOLUTE_FLOOR_RMS = 0.002;
const NOISE_FLOOR_RATIO = 2.5;

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
