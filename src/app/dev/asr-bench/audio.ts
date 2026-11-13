import { SAMPLE_RATE } from './constants';

export function syntheticClip(seconds = 10): Float32Array {
  const n = seconds * SAMPLE_RATE;
  const out = new Float32Array(n);
  let seed = 0x600d;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const f0 = 110 + 20 * Math.sin((2 * Math.PI * 0.4 * i) / n);
    out[i] =
      0.5 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * 2 * f0 * t) +
      0.15 * Math.sin(2 * Math.PI * 3 * f0 * t) +
      0.05 * rand();
  }
  return out;
}

export async function decodeBytes(raw: ArrayBuffer): Promise<Float32Array> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('No WebAudio in this browser.');
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    const targetLen = Math.floor((decoded.length * SAMPLE_RATE) / decoded.sampleRate);
    const offline = new OfflineAudioContext(1, targetLen, SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}
