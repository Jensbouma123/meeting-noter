import { describe, expect, it } from 'vitest';
import { TurnTracker } from './turns';

const FRAME = 0.01;

/** Probabilities for `speakers` channels from per-channel activity strings
 *  ('#' = active, anything else = silent), one character per frame. */
function frames(...channels: string[]): Float32Array {
  const n = channels[0].length;
  const out = new Float32Array(n * channels.length);
  channels.forEach((ch, k) => {
    for (let t = 0; t < n; t += 1) out[t * channels.length + k] = ch[t] === '#' ? 0.9 : 0.1;
  });
  return out;
}

function tracker(
  numSpeakers: number,
  opts: {
    threshold?: number;
    offThreshold?: number;
    overlapThreshold?: number;
    maxGapSec?: number;
    minTurnSec?: number;
    maxOpenSec?: number;
    provisional?: boolean;
  } = {},
) {
  return new TurnTracker({ numSpeakers, frameSec: FRAME, maxGapSec: 0.03, minTurnSec: 0.03, maxOpenSec: 1, ...opts });
}

function rounded(turns: { speaker: number; start: number; end: number }[]) {
  return turns.map((t) => ({ speaker: t.speaker, start: +t.start.toFixed(2), end: +t.end.toFixed(2) }));
}

describe('TurnTracker', () => {
  it('closes a run once it has been silent for longer than maxGap', () => {
    const t = tracker(1);
    expect(t.push(frames('..#####...'))).toEqual([]);
    expect(rounded(t.push(frames('.')))).toEqual([{ speaker: 0, start: 0.02, end: 0.07 }]);
  });

  it('bridges pauses up to maxGap inside one run', () => {
    const t = tracker(1);
    const closed = t.push(frames('###...###.....'));
    expect(rounded(closed)).toEqual([{ speaker: 0, start: 0, end: 0.09 }]);
  });

  it('drops blips shorter than minTurn', () => {
    const t = tracker(1);
    expect(t.push(frames('.##.......'))).toEqual([]);
    expect(t.flush()).toEqual([]);
  });

  it('keeps overlapping speakers as overlapping turns', () => {
    const t = tracker(2);
    const closed = t.push(frames('#######......', '...######....'));
    expect(rounded(closed)).toEqual([
      { speaker: 0, start: 0, end: 0.07 },
      { speaker: 1, start: 0.03, end: 0.09 },
    ]);
  });

  it('keeps a run on while it stays above offThreshold, and only opens one above threshold', () => {
    // 0.9 above both; 0.4 between offThreshold and threshold; 0.1 below both.
    const probs = (values: number[]) => Float32Array.from(values);
    const t = tracker(1, { threshold: 0.5, offThreshold: 0.3, maxGapSec: 0 });
    // A run at 0.4 alone never opens.
    expect(t.push(probs([0.4, 0.4, 0.4, 0.1]))).toEqual([]);
    // Opened at 0.9, it holds through 0.4 until the 0.1.
    expect(rounded(t.push(probs([0.9, 0.9, 0.4, 0.4, 0.1, 0.4, 0.1])))).toEqual([
      { speaker: 0, start: 0.04, end: 0.08 },
    ]);
  });

  it('holds a second, weaker speaker through an overlap with offThreshold', () => {
    // Speaker 1's probability dips to 0.35 while speaker 0 dominates.
    const n = 12;
    const probs = new Float32Array(n * 2);
    for (let f = 0; f < n; f += 1) {
      probs[f * 2] = 0.9;
      probs[f * 2 + 1] = f < 3 ? 0.8 : f < 9 ? 0.35 : 0.05;
    }
    const plain = tracker(2, { maxGapSec: 0 });
    const held = tracker(2, { maxGapSec: 0, offThreshold: 0.3 });
    const s1 = (spans: { speaker: number; start: number; end: number }[]) =>
      rounded(spans).filter((s) => s.speaker === 1);
    expect(s1([...plain.push(probs), ...plain.flush()])).toEqual([{ speaker: 1, start: 0, end: 0.03 }]);
    expect(s1([...held.push(probs), ...held.flush()])).toEqual([{ speaker: 1, start: 0, end: 0.09 }]);
  });

  it('opens a second speaker at overlapThreshold only while another is on', () => {
    const n = 8;
    const probs = new Float32Array(n * 2);
    for (let f = 0; f < n; f += 1) {
      probs[f * 2] = f < 6 ? 0.9 : 0.05;
      probs[f * 2 + 1] = f >= 2 ? 0.45 : 0.05;
    }
    const spans = (opts: { overlapThreshold?: number }) => {
      const t = tracker(2, { maxGapSec: 0, offThreshold: 0.3, ...opts });
      return rounded([...t.push(probs), ...t.flush()]).filter((s) => s.speaker === 1);
    };
    expect(spans({})).toEqual([]);
    // 0.45 opens speaker 1 at frame 2 (speaker 0 is on), and it holds to the end.
    expect(spans({ overlapThreshold: 0.4 })).toEqual([{ speaker: 1, start: 0.02, end: 0.08 }]);
  });

  it('splits a run still open after maxOpen, and keeps the short remainder', () => {
    const t = tracker(1, { maxOpenSec: 0.1 });
    const first = t.push(frames('#'.repeat(12)));
    expect(rounded(first)).toEqual([{ speaker: 0, start: 0, end: 0.1 }]);
    expect(rounded(t.flush())).toEqual([{ speaker: 0, start: 0.1, end: 0.12 }]);
  });

  it('reports open runs as they grow when provisional, then closes them under the same run', () => {
    const t = tracker(2, { provisional: true, maxOpenSec: 10 });
    const first = t.push(frames('#####', '..###'));
    expect(first.map((s) => [s.speaker, s.final, +s.end.toFixed(2)])).toEqual([
      [0, false, 0.05],
      [1, false, 0.05],
    ]);
    // No growth, nothing new; a blip is never reported.
    expect(t.push(frames('.', '.'))).toEqual([]);
    const blip = tracker(1, { provisional: true });
    expect(blip.push(frames('.##'))).toEqual([]);

    const later = t.push(frames('##.....', '.......'));
    const closed = later.filter((s) => s.final);
    expect(closed.map((s) => s.run)).toEqual([first[0].run, first[1].run]);
    expect(later.filter((s) => !s.final)).toEqual([]);
    expect(rounded(closed)).toEqual([
      { speaker: 0, start: 0, end: 0.08 },
      { speaker: 1, start: 0.02, end: 0.05 },
    ]);
  });

  it('lists the most recently active open run last', () => {
    const t = tracker(2, { provisional: true, maxOpenSec: 10 });
    const spans = t.push(frames('#####.', '.#####'));
    expect(spans.map((s) => s.speaker)).toEqual([0, 1]);
    expect(t.push(frames('#', '.')).map((s) => s.speaker)).toEqual([0]);
  });

  it('continues its frame clock across pushes', () => {
    const t = tracker(1);
    t.push(frames('.....'));
    t.push(frames('#####'));
    expect(t.framesSeen).toBe(10);
    expect(rounded(t.flush())).toEqual([{ speaker: 0, start: 0.05, end: 0.1 }]);
  });
});
