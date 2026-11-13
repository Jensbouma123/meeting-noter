import type { SortformerOutput, SortformerRunner } from '@/lib/diarization/browser/types';

export const SR = 16000;
const MEL = 128;
export const HIDDEN = 512;
export const SPEAKERS = 8;
export class ArrivalOrderModel implements SortformerRunner {
  async run(features: Float32Array, numMelFrames: number, cached: Float32Array, numCached: number): Promise<SortformerOutput> {
    const voiceOfMel = (f: number): number => {
      const row = features.subarray(f * MEL, (f + 1) * MEL);
      const low = Math.max(...row.subarray(0, 40));
      const high = Math.max(...row.subarray(90, MEL));
      if (Math.max(low, high) < -8) return 0;
      return low > high ? 1 : 2;
    };
    const embedFrames = Math.ceil(numMelFrames / 8);
    const chunkVoices: number[] = [];
    for (let t = 0; t < embedFrames; t += 1) {
      let voice = 0;
      for (let f = t * 8; f < Math.min(numMelFrames, t * 8 + 8) && !voice; f += 1) voice = voiceOfMel(f);
      chunkVoices.push(voice);
    }
    const cachedVoices = Array.from({ length: numCached }, (_, t) => Math.round(cached[t * HIDDEN]));
    const order: number[] = [];
    for (const v of [...cachedVoices, ...chunkVoices]) if (v && !order.includes(v)) order.push(v);

    const logits = new Float32Array((numCached + embedFrames) * 8 * SPEAKERS).fill(-10);
    cachedVoices.forEach((v, t) => {
      if (!v) return;
      for (let j = 0; j < 8; j += 1) logits[(t * 8 + j) * SPEAKERS + order.indexOf(v)] = 10;
    });
    for (let f = 0; f < numMelFrames; f += 1) {
      const v = voiceOfMel(f);
      if (v) logits[(numCached * 8 + f) * SPEAKERS + order.indexOf(v)] = 10;
    }
    const chunkEmbeds = new Float32Array(embedFrames * HIDDEN);
    chunkVoices.forEach((v, t) => chunkEmbeds.fill(v, t * HIDDEN, (t + 1) * HIDDEN));
    return { logits, chunkEmbeds, silenceEmbeds: new Float32Array(HIDDEN) };
  }
}
export function tone(freq: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i += 1) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

export const A = (s: number) => tone(200, s);
export const B = (s: number) => tone(5000, s);
export const quiet = (s: number) => new Float32Array(Math.round(s * SR));
