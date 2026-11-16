import { TurnTracker } from '../turns';
import type { RescoreInput, RescoreResult, RescoreWindow } from '../types/rescore';
import { clusterEmbeddings } from './ahc';
import { runWindows } from './exclusive-windows';
import { fbankCmn } from './fbank';
import { mapLabelsToChannels } from './label-mapping';
import { EMBEDDING_SIZE } from './params';
import { relabelProbs } from './relabel-probs';

const SLICE = 64;

function spillWindows(input: RescoreInput): RescoreWindow[] {
  return [...input.spill.runs]
    .sort((a, b) => a.channel - b.channel || a.startFrame - b.startFrame)
    .flatMap((r) => runWindows(r.channel, r.startFrame, r.endFrame));
}

async function embedWindows(input: RescoreInput, windows: RescoreWindow[]): Promise<Float32Array> {
  const d = EMBEDDING_SIZE;
  const embs = new Float32Array(windows.length * d);
  const order = windows.map((_, i) => i).sort((a, b) => windows[a].end - windows[a].start - (windows[b].end - windows[b].start) || a - b);
  for (let s = 0; s < order.length; s += SLICE) {
    const slice = order.slice(s, s + SLICE);
    const feats: Float32Array[] = [];
    const frames: number[] = [];
    for (const i of slice) {
      const f = fbankCmn(await input.spill.readWindow(windows[i]));
      feats.push(f.feats);
      frames.push(f.frames);
    }
    const out = await input.embedder.embed(feats, frames);
    slice.forEach((i, j) => embs.set(out.subarray(j * d, (j + 1) * d), i * d));
  }
  return embs;
}

function normalise(embs: Float32Array, d = EMBEDDING_SIZE): void {
  for (let i = 0; i < embs.length; i += d) {
    const row = embs.subarray(i, i + d);
    const norm = Math.hypot(...row);
    if (norm > 0) for (let c = 0; c < d; c += 1) row[c] /= norm;
  }
}

function toChannels(probs: Float32Array, numLabels: number, map: Int32Array, width: number): Float32Array {
  const frames = Math.floor(probs.length / numLabels);
  const out = new Float32Array(frames * width);
  for (let t = 0; t < frames; t += 1) {
    for (let l = 0; l < numLabels; l += 1) {
      const p = probs[t * numLabels + l];
      const at = t * width + map[l];
      if (p > out[at]) out[at] = p;
    }
  }
  return out;
}

export async function rescore(input: RescoreInput): Promise<RescoreResult | null> {
  const windows = spillWindows(input);
  if (windows.length === 0) return null;
  const embs = await embedWindows(input, windows);
  normalise(embs);
  const labels = clusterEmbeddings(embs, windows.length);
  const relabelled = relabelProbs(input.probs, input.numChannels, windows, labels);
  const map = mapLabelsToChannels(relabelled.probs, relabelled.numSpeakers, input.probs, input.numChannels);
  const width = Math.max(input.numChannels, ...map.map((m) => m + 1));
  const probs = toChannels(relabelled.probs, relabelled.numSpeakers, map, width);
  const tracker = new TurnTracker({ ...input.turnOptions, numSpeakers: width, frameSec: input.frameSec, provisional: false });
  const turns = tracker.push(probs).concat(tracker.flush());
  return { turns, numSpeakers: width, labelToChannel: map, windows: windows.length };
}
