import type { DiarizerCore } from './core';
import type { FakeModelCall } from './core-test-support.types';
import type { SortformerOutput, SortformerRunner, StreamingMode } from './types';

export const SR = 16000;
export const MEL = 128;
const HIDDEN = 512;

export const SMALL_MODE: StreamingMode = { chunkLength: 2, rightContext: 1, fifoLength: 4, updatePeriod: 2 };

export class FakeModel implements SortformerRunner {
  readonly calls: FakeModelCall[] = [];

  async run(features: Float32Array, numMelFrames: number, _cached: Float32Array, numCachedFrames: number) {
    this.calls.push({ numMelFrames, numCachedFrames, features });
    const embedFrames = Math.ceil(numMelFrames / 8);
    const logits = new Float32Array((numCachedFrames + embedFrames) * 8 * 8).fill(-10);
    for (let f = 0; f < numMelFrames; f += 1) {
      const row = features.subarray(f * MEL, (f + 1) * MEL);
      const low = Math.max(...row.subarray(0, 40));
      const high = Math.max(...row.subarray(90, MEL));
      if (Math.max(low, high) < -8) continue;
      const speaker = low > high ? 0 : 1;
      logits[((numCachedFrames * 8) + f) * 8 + speaker] = 10;
    }
    const out: SortformerOutput = {
      logits,
      chunkEmbeds: new Float32Array(embedFrames * HIDDEN),
      silenceEmbeds: new Float32Array(HIDDEN),
    };
    return out;
  }
}

export function tone(freq: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i += 1) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

export function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export async function stream(core: DiarizerCore, audio: Float32Array, origin = 0): Promise<void> {
  for (let i = 0; i < audio.length; i += 800) {
    core.push(audio.slice(i, i + 800), origin + i);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
