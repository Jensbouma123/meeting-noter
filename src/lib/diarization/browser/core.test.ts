import { describe, expect, it } from 'vitest';
import { DiarizerCore, type SortformerOutput, type SortformerRunner, type StreamingMode } from './core';
import { MelFrontend } from './mel';
import type { SpeakerTurn } from './types';

/**
 * `DiarizerCore` end to end with a stand-in for the ONNX model: it reads
 * the mel frames it is given and calls a frame speaker 0 when its energy sits
 * in the low bands, speaker 1 when it sits in the high ones, silent when there
 * is none. That keeps the chunking, cursor, cache feeding and turn timing
 * real while the "model" stays trivially predictable.
 *
 * The streaming numerics against the real model are checked outside the unit
 * tests (transformers reference vs this pipeline on the fp32 ONNX graph:
 * max probability difference 8e-5) — see exchange/nemotron-browser-diarization.md.
 */

const SR = 16000;
const MEL = 128;
const HIDDEN = 512;

interface Call {
  numMelFrames: number;
  numCachedFrames: number;
  features: Float32Array;
}

class FakeModel implements SortformerRunner {
  readonly calls: Call[] = [];

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

function tone(freq: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i += 1) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

const SMALL_MODE: StreamingMode = { chunkLength: 2, rightContext: 1, fifoLength: 4, updatePeriod: 2 };

async function stream(core: DiarizerCore, audio: Float32Array, origin = 0): Promise<void> {
  for (let i = 0; i < audio.length; i += 800) {
    core.push(audio.slice(i, i + 800), origin + i);
    // Let each step finish, as a fast device would.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('DiarizerCore chunking', () => {
  it('feeds (chunk + look-ahead) frames per step, advancing by the chunk, with the cache growing as the FIFO fills', async () => {
    const model = new FakeModel();
    const core = new DiarizerCore({ source: 'mic', model, mode: SMALL_MODE });
    await stream(core, new Float32Array(SR)); // 100 mel frames
    const live = model.calls.length;
    expect(model.calls.every((c) => c.numMelFrames === 24)).toBe(true);
    // FIFO 2, 4, then each overflow moves updatePeriod (2) frames to the cache.
    expect(model.calls.slice(0, 5).map((c) => c.numCachedFrames)).toEqual([0, 2, 4, 6, 8]);

    await core.flush();
    // Every mel frame is scored exactly once: floor(16000 / 160) = 100.
    const tail = model.calls.slice(live);
    const own = model.calls.map((c, i) => (i < model.calls.length - 1 ? 16 : c.numMelFrames));
    expect(own.reduce((a, b) => a + b, 0)).toBe(100);
    // The last step has no look-ahead left to wait for.
    expect(tail[tail.length - 1].numMelFrames).toBeLessThanOrEqual(16);
  });

  it('passes each step the mel frames at its cursor', async () => {
    const audio = concat([tone(300, 0.5), tone(4000, 0.5)]);
    const model = new FakeModel();
    const core = new DiarizerCore({ source: 'mic', model, mode: SMALL_MODE });
    await stream(core, audio);
    await core.flush();

    const mel = new MelFrontend();
    const reference = concat([mel.push(audio), mel.finish()]);
    let cursor = 0;
    for (const call of model.calls) {
      const expected = reference.subarray(cursor * MEL, (cursor + call.numMelFrames) * MEL);
      expect(Array.from(call.features)).toEqual(Array.from(expected));
      cursor += Math.min(call.numMelFrames, 16);
    }
  });
});

describe('DiarizerCore turns', () => {
  it('reports each speaker\'s turns on the caller\'s capture clock', async () => {
    const audio = concat([tone(200, 2), new Float32Array(SR), tone(5000, 2), new Float32Array(SR)]);
    const core = new DiarizerCore({ source: 'system', model: new FakeModel(), mode: SMALL_MODE });
    const turns: SpeakerTurn[] = [];
    core.onSpeakerTurn((t) => turns.push(t));
    await stream(core, audio, 10 * SR);
    await core.flush();

    expect(turns.map((t) => t.speaker)).toEqual(['system:0', 'system:1']);
    expect(turns[0].source).toBe('system');
    expect(turns[0].start).toBeCloseTo(10, 1);
    expect(turns[0].end).toBeCloseTo(12, 1);
    expect(turns[1].start).toBeCloseTo(13, 1);
    expect(turns[1].end).toBeCloseTo(15, 1);
  });

  it('emits closed turns while streaming, not only on flush', async () => {
    // The turn closes 1 s (maxGapSec) into the silence, which the model has
    // seen once a further chunk + look-ahead has arrived.
    const audio = concat([tone(200, 1), new Float32Array(2 * SR)]);
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE });
    const turns: SpeakerTurn[] = [];
    core.onSpeakerTurn((t) => turns.push(t));
    await stream(core, audio);
    expect(turns).toHaveLength(1);
  });

  it('marks a turn split for running long as one the speaker continues past', async () => {
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE, turns: { maxOpenSec: 1 } });
    const turns: SpeakerTurn[] = [];
    core.onSpeakerTurn((t) => turns.push(t));
    await stream(core, tone(200, 2.5));
    await core.flush();

    expect(turns.length).toBeGreaterThan(1);
    expect(turns.slice(0, -1).every((t) => t.continues === true)).toBe(true);
    expect(turns[turns.length - 1].continues).toBeUndefined();
  });

  it('gives the live feeding the same model inputs and final turns as the offline script', async () => {
    // Offline (`diarization-der.mjs`): 50 ms pushes from sample 0, each step
    // finished before the next push. Live (`worker.ts`): the worklet's 100 ms
    // frames on the capture clock, provisional turns, and a model slow enough
    // that frames pile up while a step runs.
    const audio = concat([tone(200, 1.5), new Float32Array(SR), tone(5000, 2), tone(200, 1), new Float32Array(SR / 2)]);
    const offlineModel = new FakeModel();
    const offline = new DiarizerCore({ source: 'mic', model: offlineModel, mode: SMALL_MODE });
    const offlineTurns: SpeakerTurn[] = [];
    offline.onSpeakerTurn((t) => offlineTurns.push(t));
    await stream(offline, audio);
    await offline.flush();

    const liveModel = new FakeModel();
    const slow: SortformerRunner = {
      run: async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        return liveModel.run(...args);
      },
    };
    const live = new DiarizerCore({ source: 'mic', model: slow, mode: SMALL_MODE, turns: { provisional: true } });
    const liveTurns: SpeakerTurn[] = [];
    live.onSpeakerTurn((t) => liveTurns.push(t));
    const origin = 7 * SR;
    for (let i = 0; i < audio.length; i += 1600) live.push(audio.slice(i, i + 1600), origin + i);
    await live.flush();

    expect(liveModel.calls.map((c) => [c.numMelFrames, c.numCachedFrames])).toEqual(
      offlineModel.calls.map((c) => [c.numMelFrames, c.numCachedFrames]),
    );
    liveModel.calls.forEach((c, i) => expect(c.features).toEqual(offlineModel.calls[i].features));
    const shifted = liveTurns.filter((t) => t.final).map((t) => [t.speaker, t.start - 7, t.end - 7]);
    expect(offlineTurns.length).toBeGreaterThan(2);
    expect(shifted).toHaveLength(offlineTurns.length);
    shifted.forEach(([speaker, start, end], i) => {
      expect(speaker).toBe(offlineTurns[i].speaker);
      expect(start).toBeCloseTo(offlineTurns[i].start, 6);
      expect(end).toBeCloseTo(offlineTurns[i].end, 6);
    });
  });

  it('with provisional turns, names a speaker while they are still talking', async () => {
    // 3 s of one speaker with no pause: no turn closes, yet the open one is
    // reported step by step under one id, and closes under the same id.
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE, turns: { provisional: true } });
    const turns: SpeakerTurn[] = [];
    core.onSpeakerTurn((t) => turns.push(t));
    await stream(core, tone(200, 3));

    const open = turns.filter((t) => t.final === false);
    expect(open.length).toBeGreaterThan(1);
    expect(open.every((t) => t.speaker === 'mic:0' && t.id === open[0].id)).toBe(true);
    // Known within one step (chunk + look-ahead = 0.24 s) plus a frame.
    expect(3 - open[open.length - 1].end).toBeLessThan(0.3);

    await core.flush();
    const last = turns[turns.length - 1];
    expect(last).toMatchObject({ id: open[0].id, final: true });
    expect(last.end).toBeCloseTo(3, 1);
  });

  it('ignores audio after flush, and a second flush', async () => {
    const model = new FakeModel();
    const core = new DiarizerCore({ source: 'mic', model, mode: SMALL_MODE });
    await stream(core, tone(200, 0.5));
    await core.flush();
    const calls = model.calls.length;
    core.push(tone(200, 1), 0);
    await core.flush();
    expect(model.calls.length).toBe(calls);
  });

  it('stops emitting once disposed', async () => {
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE });
    const turns: SpeakerTurn[] = [];
    core.onSpeakerTurn((t) => turns.push(t));
    await stream(core, tone(200, 1));
    core.dispose();
    await core.flush();
    expect(turns).toEqual([]);
  });
});
