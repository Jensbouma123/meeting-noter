import { describe, expect, it } from 'vitest';
import { SpeakerCache, type SpeakerCacheConfig } from './speaker-cache';

/**
 * The FIFO + Arrival-Order Speaker Cache bookkeeping, checked against the
 * behaviour of transformers' `Nemotron3DiarizationSpeakerCache` (and NeMo's
 * `streaming_update` / `_compress_spkcache`) on hand-sized inputs.
 *
 * Frames carry their own id as every embedding value, so where a frame ended
 * up is readable straight off `getEmbeds()`.
 */

const HIDDEN = 2;
const SPEAKERS = 2;
const SUB = 2;
const SILENCE_ID = -1;

function cache(config: Partial<SpeakerCacheConfig> = {}): SpeakerCache {
  return new SpeakerCache({
    fifoLength: 6,
    cacheLength: 8,
    updatePeriod: 4,
    numSpeakers: SPEAKERS,
    hiddenSize: HIDDEN,
    subsamplingFactor: SUB,
    ...config,
  });
}

function embeds(ids: number[]): Float32Array {
  const out = new Float32Array(ids.length * HIDDEN);
  ids.forEach((id, i) => out.fill(id, i * HIDDEN, (i + 1) * HIDDEN));
  return out;
}

const silence = embeds([SILENCE_ID]);

function logit(p: number): number {
  return Math.log(p / (1 - p));
}

/** Logits whose pooled (encoder-rate) probabilities are exactly `probs`. */
function logits(probs: number[][]): Float32Array {
  const out = new Float32Array(probs.length * SUB * SPEAKERS);
  probs.forEach((row, t) => {
    for (let j = 0; j < SUB; j += 1) {
      row.forEach((p, k) => {
        out[(t * SUB + j) * SPEAKERS + k] = logit(p);
      });
    }
  });
  return out;
}

function ids(c: SpeakerCache): number[] {
  const e = c.getEmbeds();
  const out: number[] = [];
  for (let i = 0; i < e.length; i += HIDDEN) out.push(Math.round(e[i]));
  return out;
}

const QUIET = [0.05, 0.05];
const S0 = [0.9, 0.05];

/** One step: `chunk` ids join after the frames already cached, all speaking as `row`. */
function step(c: SpeakerCache, chunk: number[], rows: number[][] = [], lookahead: number[] = []): void {
  const inputFrames = c.numCachedFrames + chunk.length + lookahead.length;
  const probs = Array.from({ length: inputFrames }, (_, i) => rows[i] ?? QUIET);
  c.update(embeds([...chunk, ...lookahead]), logits(probs), silence, chunk.length);
}

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
    // 9 frames > 6: max(updatePeriod 4, overflow 3) = 4 popped.
    expect(c.cacheFrames).toBe(4);
    expect(c.fifoFrames).toBe(5);
    expect(ids(c)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('pops the whole overflow when it exceeds updatePeriod', () => {
    const c = cache();
    step(c, [0, 1, 2, 3, 4, 5]);
    step(c, [6, 7, 8, 9, 10, 11, 12]);
    // 13 frames > 6: overflow 7 > updatePeriod 4.
    expect(c.cacheFrames).toBe(7);
    expect(c.fifoFrames).toBe(6);
  });

  it('re-estimates an uncompressed cache from the latest step', () => {
    const c = cache();
    step(c, [0, 1, 2, 3, 4, 5]);
    step(c, [6, 7, 8, 9]); // pops 4 frames, probabilities from this step
    expect(c.cacheFrames).toBe(4);
    // Next step scores the cached frames as speaker 0; nothing is compressed
    // yet, so those are the probabilities that travel with them.
    step(c, [10, 11, 12, 13], [S0, S0, S0, S0]);
    const probs = c.getCacheProbs();
    expect(probs[0]).toBeCloseTo(0.9, 5);
    expect(probs[1]).toBeCloseTo(0.05, 5);
  });
});

describe('SpeakerCache compression', () => {
  it('keeps the most confident frames per speaker, grouped by speaker in arrival order, each group ending in silence', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    // fifoLength 0: every chunk frame moves straight to the cache. The first
    // step fills it without compressing (7 frames <= 8).
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
    // 3 more frames overflow it: 10 frames, 8 slots. Per speaker the budget
    // is 8 / 2 - 1 = 3 frames plus a silence slot; frame 7 (speaker 0, least
    // confident) and the silent frames 5, 8, 9 are the ones left out.
    step(c, [7, 8, 9], [...first, [0.6, 0.05], QUIET, QUIET]);
    expect(c.isCompressed).toBe(true);
    expect(c.cacheFrames).toBe(8);
    expect(ids(c)).toEqual([0, 1, 3, 4, SILENCE_ID, 2, 6, SILENCE_ID]);
    // Silence slots carry zero probabilities; kept frames keep theirs.
    const probs = c.getCacheProbs();
    expect(Array.from(probs.slice(8, 10))).toEqual([0, 0]);
    expect(probs[0]).toBeCloseTo(0.9, 5);
  });

  it('prefers the newest of equally good frames', () => {
    const c = cache({ fifoLength: 0, updatePeriod: 1 });
    const first = [S0, S0, S0, S0, [0.05, 0.9], [0.05, 0.9], QUIET, QUIET];
    step(c, [0, 1, 2, 3, 4, 5, 6, 7], first);
    // Frame 8 (index >= cacheLength) is just popped from the FIFO and gets
    // latestFramesScoreBoost, so it outranks the identical older frames:
    // one of those is dropped instead.
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
    // This step claims every cached frame is silent; a compressed cache is
    // out of order, so those rows are not its frames' and must be ignored.
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
    // budget 3 → minPositiveScores floor(1.5) = 1.
    const c = cache();
    const overlapOnly = new Float32Array([0.9, 0.9]);
    expect(c.frameScores(overlapOnly, 1)[0]).toBeGreaterThan(-Infinity);
    const withClean = new Float32Array([0.9, 0.9, 0.9, 0.05]);
    const scores = c.frameScores(withClean, 2);
    expect(scores[0]).toBe(-Infinity);
    expect(scores[2]).toBeGreaterThan(0);
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
    // Speaker 0's frames, then speaker 1's, each group closed by silence.
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
