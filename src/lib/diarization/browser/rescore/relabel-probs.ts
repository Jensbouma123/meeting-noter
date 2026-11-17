import type { RescoreWindow } from '../types/rescore';

function channelLabels(
  windows: RescoreWindow[],
  labels: Int32Array,
  k: number,
  frames: number,
  fallback: number,
): Int32Array {
  const ws = windows
    .map((w, i) => ({ c: 0.5 * (w.start + w.end), l: labels[i], k: w.channel }))
    .filter((w) => w.k === k)
    .sort((a, b) => a.c - b.c);
  const col = new Int32Array(frames).fill(fallback);
  if (ws.length === 0) return col;
  let j = 0;
  for (let t = 0; t < frames; t += 1) {
    while (j + 1 < ws.length && Math.abs(ws[j + 1].c - t) < Math.abs(t - ws[j].c)) j += 1;
    col[t] = ws[j].l;
  }
  return col;
}

export function relabelProbs(
  probs: ArrayLike<number>,
  numChannels: number,
  windows: RescoreWindow[],
  labels: Int32Array,
): { probs: Float32Array; numSpeakers: number } {
  const frames = Math.floor(probs.length / numChannels);
  const numLabels = labels.length > 0 ? Math.max(...labels) + 1 : 0;
  const cols = Array.from({ length: numChannels }, (_, k) => channelLabels(windows, labels, k, frames, numLabels + k));
  const used = new Set<number>();
  cols.forEach((col, k) => {
    for (let t = 0; t < frames; t += 1) if (probs[t * numChannels + k] > 0.1) used.add(col[t]);
  });
  const remap = new Map([...used].sort((a, b) => a - b).map((u, i) => [u, i]));
  const width = Math.max(1, remap.size);
  const out = new Float32Array(frames * width);
  cols.forEach((col, k) => {
    for (let t = 0; t < frames; t += 1) {
      const p = probs[t * numChannels + k];
      const target = remap.get(col[t]);
      if (p > 0 && target !== undefined && p > out[t * width + target]) out[t * width + target] = p;
    }
  });
  return { probs: out, numSpeakers: width };
}
