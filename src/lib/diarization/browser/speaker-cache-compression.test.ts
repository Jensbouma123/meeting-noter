import { describe, expect, it } from 'vitest';
import {
  QUIET,
  SILENCE_ID,
  SPEAKING_FIRST as S0,
  cachedFrameIds as ids,
  makeCache as cache,
  stepCache as step,
} from './speaker-cache-test-support';

describe('SpeakerCache compression', () => {
  it('keeps the most confident frames per speaker, grouped by speaker in arrival order, each group ending in silence', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    const first = [
      [0.9, 0.05],
      [0.88, 0.05],
      [0.05, 0.9],
      [0.86, 0.05],
      [0.84, 0.05],
      [0.05, 0.05],
      [0.05, 0.9],
    ];
    step(c, [0, 1, 2, 3, 4, 5, 6], first);
    expect(c.isCompressed).toBe(false);
    step(c, [7, 8, 9], [...first, [0.6, 0.05], QUIET, QUIET]);
    expect(c.isCompressed).toBe(true);
    expect(c.cacheFrames).toBe(8);
    expect(ids(c)).toEqual([0, 1, 3, 4, SILENCE_ID, 2, 6, SILENCE_ID]);
    const probs = c.getCacheProbs();
    expect(Array.from(probs.slice(8, 10))).toEqual([0, 0]);
    expect(probs[0]).toBeCloseTo(0.9, 5);
  });

  it('prefers the newest of equally good frames', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    const first = [S0, S0, S0, S0, [0.05, 0.9], [0.05, 0.9], QUIET, QUIET];
    step(c, [0, 1, 2, 3, 4, 5, 6, 7], first);
    step(c, [8], [...first, S0]);
    const kept = ids(c);
    expect(kept).toContain(8);
    expect(kept.filter((id) => id >= 0 && id <= 3)).toHaveLength(3);
  });

  it('fills slots no speaker earns with silence, after the speaker groups', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    step(c, [0, 1, 2, 3, 4, 5, 6, 7, 8], [S0, QUIET, QUIET, QUIET, QUIET, QUIET, QUIET, QUIET, QUIET]);
    expect(ids(c)).toEqual([0, SILENCE_ID, SILENCE_ID, SILENCE_ID, SILENCE_ID, SILENCE_ID, SILENCE_ID, SILENCE_ID]);
  });

  it('keeps a compressed cache\'s stored probabilities instead of re-estimating them', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    const speaking = [S0, S0, S0, [0.05, 0.9], [0.05, 0.9], QUIET, QUIET, QUIET, QUIET];
    step(c, [0, 1, 2, 3, 4, 5, 6, 7, 8], speaking);
    expect(c.isCompressed).toBe(true);
    const before = c.getCacheProbs();
    step(c, [9], Array.from({ length: 9 }, () => QUIET));
    const after = c.getCacheProbs();
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[0]).toBeCloseTo(0.9, 5);
  });
});

describe('SpeakerCache.frameScores', () => {
  it('scores non-speech -Infinity and single-speaker speech positive', () => {
    const c = cache();
    const probs = new Float32Array([0.9, 0.05, 0.05, 0.05]);
    const scores = c.frameScores(probs, 2);
    expect(scores[0]).toBeGreaterThan(0);
    expect(scores[1]).toBe(-Infinity);
    expect(scores[2]).toBe(-Infinity);
    expect(scores[3]).toBe(-Infinity);
  });

  it('drops overlapped frames only once a speaker has enough clean ones', () => {
    const c = cache();
    const overlapOnly = new Float32Array([0.9, 0.9]);
    expect(c.frameScores(overlapOnly, 1)[0]).toBeGreaterThan(-Infinity);
    const withClean = new Float32Array([0.9, 0.9, 0.9, 0.05]);
    const scores = c.frameScores(withClean, 2);
    expect(scores[0]).toBe(-Infinity);
    expect(scores[2]).toBeGreaterThan(0);
  });
});
