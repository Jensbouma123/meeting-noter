import type { RescoreWindow } from '../types/rescore';
import { RESCORE_PARAMS } from './params';

export function runWindows(channel: number, start: number, end: number, p = RESCORE_PARAMS): RescoreWindow[] {
  const len = end - start;
  if (len < p.minRunFrames) return [];
  if (len <= p.windowFrames) return [{ channel, start, end }];
  const out: RescoreWindow[] = [];
  for (let a = start; a <= end - p.windowFrames; a += p.hopFrames)
    out.push({ channel, start: a, end: a + p.windowFrames });
  if (out[out.length - 1].end < end) out.push({ channel, start: end - p.windowFrames, end });
  return out;
}

export function exclusiveWindows(probs: Float32Array, numChannels: number, p = RESCORE_PARAMS): RescoreWindow[] {
  const frames = Math.floor(probs.length / numChannels);
  const owner = new Int16Array(frames).fill(-1);
  for (let t = 0; t < frames; t += 1) {
    let count = 0;
    for (let k = 0; k < numChannels; k += 1) {
      if (probs[t * numChannels + k] > 0.5) {
        count += 1;
        owner[t] = k;
      }
    }
    if (count !== 1) owner[t] = -1;
  }
  const out: RescoreWindow[] = [];
  for (let k = 0; k < numChannels; k += 1) {
    let start = -1;
    for (let t = 0; t <= frames; t += 1) {
      const on = t < frames && owner[t] === k;
      if (on && start < 0) start = t;
      if (!on && start >= 0) {
        out.push(...runWindows(k, start, t, p));
        start = -1;
      }
    }
  }
  return out;
}
