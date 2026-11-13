import { describe, expect, it } from 'vitest';
import { LiveChunker } from './live-chunker';
import { DEFAULT_LIVE_CHUNKER_CONFIG, LIVE_SAMPLE_RATE as SR } from './live-chunker-defaults';
import { FRAME, idFactory } from './live-chunker-harness';
import { voice } from './test-signals';

describe('live chunking takes', () => {
  it('takes the first window as soon as the gate opens, not after a full step', () => {
    const chunker = new LiveChunker(idFactory());
    let firstTake = -1;
    let gateOpen = -1;
    for (let i = 0; i < 30 && firstTake < 0; i += 1) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
      if (gateOpen < 0 && chunker.due()) gateOpen = i;
      if (chunker.due()) firstTake = ((i + 1) * FRAME) / SR;
    }
    expect(firstTake).toBeGreaterThan(0.2);
    expect(firstTake).toBeLessThanOrEqual(0.5);
    expect(firstTake).toBeLessThan(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples / SR - 0.9);
    console.log(`first take due ${firstTake.toFixed(2)} s after voiced onset (was ~1.5 s)`);
  });

  it('keeps the 1.5 s step for takes after the first partial is open', () => {
    const chunker = new LiveChunker(idFactory());
    let i = 0;
    while (!chunker.due()) chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
    const req = chunker.take()!;
    chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.4 }]);
    let taken = 0;
    while (!chunker.due()) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
      taken += FRAME;
    }
    expect(taken).toBe(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples);
  });

  it('takes the tail once, early, when a pause starts; final still follows at 0.6 s', () => {
    const chunker = new LiveChunker(idFactory());
    const seen: { at: number; final: boolean }[] = [];
    let i = 0;
    const feed = (frame: Float32Array) => {
      chunker.push(frame, i * FRAME);
      i += 1;
      if (chunker.due()) {
        const req = chunker.take()!;
        seen.push({ at: (i * FRAME) / SR, final: req.final });
        chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.4 }]);
      }
    };
    while (seen.length === 0) feed(voice(FRAME, 0.3, i * FRAME));
    for (let k = 0; k < 5; k += 1) feed(voice(FRAME, 0.3, i * FRAME));
    const speechEnd = (i * FRAME) / SR;
    seen.length = 0;
    for (let k = 0; k < 10; k += 1) feed(new Float32Array(FRAME));
    const gaps = seen.map((s) => ({ after: +(s.at - speechEnd).toFixed(2), final: s.final }));
    console.log('takes after speech end:', JSON.stringify(gaps));
    expect(gaps.filter((g) => !g.final)).toHaveLength(1);
    expect(gaps[0].after).toBeLessThanOrEqual(0.3);
    expect(gaps[gaps.length - 1]).toEqual({ after: 0.6, final: true });
  });

  it('falls back to the 1.5 s step after a first take that opened no segment', () => {
    const chunker = new LiveChunker(idFactory());
    let i = 0;
    while (!chunker.due()) chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
    const req = chunker.take()!;
    expect(chunker.apply(req, [{ text: 'Hmm.', start: 0.1, end: 0.4 }])).toEqual([]);
    let waited = 0;
    while (!chunker.due()) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
      waited += FRAME;
    }
    expect(waited).toBe(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples);
  });
});
