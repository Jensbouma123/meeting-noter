import { describe, expect, it } from 'vitest';
import { DiarizerCore } from './core';
import { FakeModel, SMALL_MODE, SR, concat, stream, tone } from './core-test-support';
import type { SortformerRunner, SpeakerTurn } from './types';

function collectTurns(core: DiarizerCore): SpeakerTurn[] {
  const turns: SpeakerTurn[] = [];
  core.onSpeakerTurn((t) => turns.push(t));
  return turns;
}

describe('DiarizerCore turns', () => {
  it('reports each speaker\'s turns on the caller\'s capture clock', async () => {
    const audio = concat([tone(200, 2), new Float32Array(SR), tone(5000, 2), new Float32Array(SR)]);
    const core = new DiarizerCore({ source: 'system', model: new FakeModel(), mode: SMALL_MODE });
    const turns = collectTurns(core);
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
    const audio = concat([tone(200, 1), new Float32Array(2 * SR)]);
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE });
    const turns = collectTurns(core);
    await stream(core, audio);
    expect(turns).toHaveLength(1);
  });

  it('marks a turn split for running long as one the speaker continues past', async () => {
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE, turns: { maxOpenSec: 1 } });
    const turns = collectTurns(core);
    await stream(core, tone(200, 2.5));
    await core.flush();

    expect(turns.length).toBeGreaterThan(1);
    expect(turns.slice(0, -1).every((t) => t.continues === true)).toBe(true);
    expect(turns[turns.length - 1].continues).toBeUndefined();
  });

  it('gives the live feeding the same model inputs and final turns as the offline script', async () => {
    const audio = concat([tone(200, 1.5), new Float32Array(SR), tone(5000, 2), tone(200, 1), new Float32Array(SR / 2)]);
    const offlineModel = new FakeModel();
    const offline = new DiarizerCore({ source: 'mic', model: offlineModel, mode: SMALL_MODE });
    const offlineTurns = collectTurns(offline);
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
    const liveTurns = collectTurns(live);
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
    const core = new DiarizerCore({ source: 'mic', model: new FakeModel(), mode: SMALL_MODE, turns: { provisional: true } });
    const turns = collectTurns(core);
    await stream(core, tone(200, 3));

    const open = turns.filter((t) => t.final === false);
    expect(open.length).toBeGreaterThan(1);
    expect(open.every((t) => t.speaker === 'mic:0' && t.id === open[0].id)).toBe(true);
    expect(3 - open[open.length - 1].end).toBeLessThan(0.3);

    await core.flush();
    const last = turns[turns.length - 1];
    expect(last).toMatchObject({ id: open[0].id, final: true });
    expect(last.end).toBeCloseTo(3, 1);
  });
});
