import { describe, expect, it } from 'vitest';
import { DiarizerCore } from './core';
import { FakeModel, MEL, SMALL_MODE, SR, concat, stream, tone } from './core-test-support';
import { MelFrontend } from './mel';
import type { SpeakerTurn } from './types';

describe('DiarizerCore chunking', () => {
  it('feeds (chunk + look-ahead) frames per step, advancing by the chunk, with the cache growing as the FIFO fills', async () => {
    const model = new FakeModel();
    const core = new DiarizerCore({ source: 'mic', model, mode: SMALL_MODE });
    await stream(core, new Float32Array(SR));
    const live = model.calls.length;
    expect(model.calls.every((c) => c.numMelFrames === 24)).toBe(true);
    expect(model.calls.slice(0, 5).map((c) => c.numCachedFrames)).toEqual([0, 2, 4, 6, 8]);

    await core.flush();
    const tail = model.calls.slice(live);
    const own = model.calls.map((c, i) => (i < model.calls.length - 1 ? 16 : c.numMelFrames));
    expect(own.reduce((a, b) => a + b, 0)).toBe(100);
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

describe('DiarizerCore lifecycle', () => {
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
