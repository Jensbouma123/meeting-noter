import { describe, expect, it } from 'vitest';
import type { RescoreWindow, SpeakerEmbedderLike, SpillReader, SpillRun } from '../types/rescore';
import { EMBEDDING_SIZE, HOP_SAMPLES, WINDOW_TAIL_SAMPLES } from './params';
import { rescore } from './rescore';

const RUN = 300;

function fakes(runs: SpillRun[], speakerAt: (frame: number) => number) {
  const queue: Int16Array[] = [];
  const reads: RescoreWindow[] = [];
  const spill: SpillReader = {
    runs,
    readWindow: async (w) => {
      reads.push(w);
      const audio = new Int16Array((w.end - w.start) * HOP_SAMPLES + WINDOW_TAIL_SAMPLES);
      for (let i = 0; i < audio.length; i += 1) audio[i] = ((i * 7919) % 2000) - 1000;
      audio[0] = speakerAt(w.start);
      queue.push(audio);
      return audio;
    },
  };
  const embedder: SpeakerEmbedderLike = {
    embed: async (feats, frames) => {
      expect(frames).toHaveLength(feats.length);
      const out = new Float32Array(feats.length * EMBEDDING_SIZE);
      queue.splice(0, feats.length).forEach((audio, j) => {
        out[j * EMBEDDING_SIZE + audio[0]] = 3;
      });
      return out;
    },
  };
  return { spill, embedder, reads };
}

function oldProbs(owner: number[]): Float32Array {
  const probs = new Float32Array(owner.length * RUN * 2);
  owner.forEach((k, r) => {
    for (let t = r * RUN; t < (r + 1) * RUN; t += 1) probs[t * 2 + k] = 0.9;
  });
  return probs;
}

const run = (channel: number, r: number): SpillRun => ({
  channel, startFrame: r * RUN, endFrame: (r + 1) * RUN, offset: 0, length: 0,
});

describe('rescore', () => {
  it('returns null without spilled runs', async () => {
    const { spill, embedder } = fakes([], () => 0);
    expect(await rescore({ probs: new Float32Array(10), numChannels: 2, spill, embedder, frameSec: 0.08 })).toBeNull();
  });

  it('moves a mislabelled run onto the channel of the voice that spoke it', async () => {
    const { spill, embedder, reads } = fakes([run(0, 0), run(1, 1), run(0, 2)], (f) => (f < RUN ? 0 : 1));
    const result = await rescore({ probs: oldProbs([0, 1, 0]), numChannels: 2, spill, embedder, frameSec: 0.08, turnOptions: { maxOpenSec: 100 } });
    expect(result).not.toBeNull();
    expect(result!.windows).toBe(9);
    expect(reads).toHaveLength(9);
    expect(Array.from(result!.labelToChannel)).toEqual([0, 1]);
    expect(result!.numSpeakers).toBe(2);
    const spans = result!.turns.map((s) => ({ speaker: s.speaker, start: Math.round(s.start), end: Math.round(s.end) }));
    expect(spans).toEqual([
      { speaker: 0, start: 0, end: 24 },
      { speaker: 1, start: 24, end: 72 },
    ]);
  });

  it('keeps old channels and appends a new one for an unseen voice', async () => {
    const { spill, embedder } = fakes([run(0, 0), run(1, 1), run(0, 2)], (f) => (f < 2 * RUN ? f < RUN ? 0 : 1 : 2));
    const result = await rescore({ probs: oldProbs([0, 1, 0]), numChannels: 2, spill, embedder, frameSec: 0.08 });
    expect(Array.from(result!.labelToChannel)).toEqual([0, 2, 1]);
    expect(result!.numSpeakers).toBe(3);
    expect([...new Set(result!.turns.map((s) => s.speaker))].sort()).toEqual([0, 1, 2]);
  });
});
