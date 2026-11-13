import { describe, expect, it } from 'vitest';
import {
  HIDDEN,
  QUIET,
  SILENCE_ID,
  SPEAKERS,
  SPEAKING_FIRST as S0,
  cachedFrameIds as ids,
  makeCache as cache,
  stepCache as step,
} from './speaker-cache-test-support';

describe('SpeakerCache FIFO', () => {
  it('keeps every frame in the FIFO until it overflows', () => {
    const c = cache();
    step(c, [0, 1, 2]);
    expect(ids(c)).toEqual([0, 1, 2]);
    step(c, [3, 4, 5]);
    expect(c.fifoFrames).toBe(6);
    expect(c.cacheFrames).toBe(0);
  });

  it('does not queue the look-ahead frames: they open the next chunk', () => {
    const c = cache();
    step(c, [0, 1], [], [100, 101]);
    expect(ids(c)).toEqual([0, 1]);
  });

  it('moves updatePeriod oldest frames to the cache on overflow, in order', () => {
    const c = cache();
    step(c, [0, 1, 2]);
    step(c, [3, 4, 5]);
    step(c, [6, 7, 8]);
    expect(c.cacheFrames).toBe(4);
    expect(c.fifoFrames).toBe(5);
    expect(ids(c)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('pops the whole overflow when it exceeds updatePeriod', () => {
    const c = cache();
    step(c, [0, 1, 2, 3, 4, 5]);
    step(c, [6, 7, 8, 9, 10, 11, 12]);
    expect(c.cacheFrames).toBe(7);
    expect(c.fifoFrames).toBe(6);
  });

  it('re-estimates an uncompressed cache from the latest step', () => {
    const c = cache();
    step(c, [0, 1, 2, 3, 4, 5]);
    step(c, [6, 7, 8, 9]);
    expect(c.cacheFrames).toBe(4);
    step(c, [10, 11, 12, 13], [S0, S0, S0, S0]);
    const probs = c.getCacheProbs();
    expect(probs[0]).toBeCloseTo(0.9, 5);
    expect(probs[1]).toBeCloseTo(0.05, 5);
  });
});

describe('SpeakerCache snapshot / restore', () => {
  it('folds the FIFO into the cache, with the probabilities its last step gave it', () => {
    const c = cache();
    step(c, [0, 1, 2], [S0, QUIET, S0]);
    const snap = c.snapshot();
    expect(snap.numFrames).toBe(3);
    expect(snap.compressed).toBe(false);
    const restored = cache();
    expect(restored.restore(snap)).toBe(true);
    expect(ids(restored)).toEqual([0, 1, 2]);
    expect(restored.cacheFrames).toBe(3);
    expect(restored.fifoFrames).toBe(0);
    expect(restored.getCacheProbs()[0]).toBeCloseTo(0.9, 5);
    expect(restored.getCacheProbs()[2]).toBeCloseTo(0.05, 5);
  });

  it('compresses cache and FIFO together when they overflow the cache', () => {
    const c = cache();
    const rows = [S0, S0, [0.05, 0.9], [0.05, 0.9], S0, QUIET];
    step(c, [0, 1, 2, 3, 4, 5], rows);
    step(c, [6, 7, 8, 9, 10, 11], [...rows, S0, S0, [0.05, 0.9], QUIET, QUIET, QUIET]);
    expect(c.numCachedFrames).toBeGreaterThan(8);
    const snap = c.snapshot();
    expect(snap.numFrames).toBe(8);
    expect(snap.compressed).toBe(true);
    const restored = cache();
    restored.restore(snap);
    const kept = ids(restored);
    expect(kept.indexOf(SILENCE_ID)).toBeLessThan(kept.indexOf(2));
    expect(kept.filter((id) => id === SILENCE_ID)).toHaveLength(2);
  });

  it('refuses a snapshot that does not fit', () => {
    const c = cache();
    const tooLong = { numFrames: 9, compressed: false, embeds: new Float32Array(9 * HIDDEN), probs: new Float32Array(9 * SPEAKERS) };
    expect(c.restore(tooLong)).toBe(false);
    const wrongShape = { numFrames: 1, compressed: false, embeds: new Float32Array(3), probs: new Float32Array(SPEAKERS) };
    expect(c.restore(wrongShape)).toBe(false);
    expect(c.numCachedFrames).toBe(0);
  });

  it('continues a restored stream as the snapshot left it', () => {
    const c = cache();
    step(c, [0, 1, 2], [S0, S0, S0]);
    const restored = cache();
    restored.restore(c.snapshot());
    step(restored, [3, 4]);
    expect(ids(restored)).toEqual([0, 1, 2, 3, 4]);
    expect(restored.cacheFrames).toBe(3);
    expect(restored.fifoFrames).toBe(2);
  });
});
