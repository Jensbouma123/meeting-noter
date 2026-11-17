import { describe, expect, it } from 'vitest';
import { averageLinkage, clusterEmbeddings } from './ahc';
import { exclusiveWindows, runWindows } from './exclusive-windows';
import { RescoreGate } from './gate';
import { relabelProbs } from './relabel-probs';

const unit = (...rows: number[][]): Float32Array =>
  Float32Array.from(rows.flatMap((r) => r.map((x) => x / Math.hypot(...r))));

describe('exclusive windows', () => {
  it('drops short runs, keeps a mid run whole and tiles a long run ending flush', () => {
    expect(runWindows(0, 0, 49)).toEqual([]);
    expect(runWindows(2, 10, 160)).toEqual([{ channel: 2, start: 10, end: 160 }]);
    expect(runWindows(1, 0, 400)).toEqual([
      { channel: 1, start: 0, end: 150 },
      { channel: 1, start: 75, end: 225 },
      { channel: 1, start: 150, end: 300 },
      { channel: 1, start: 225, end: 375 },
      { channel: 1, start: 250, end: 400 },
    ]);
  });

  it('ignores frames where two channels overlap', () => {
    const probs = new Float32Array(120 * 2);
    for (let t = 0; t < 120; t += 1) probs[t * 2] = 0.9;
    for (let t = 0; t < 60; t += 1) probs[t * 2 + 1] = 0.9;
    expect(exclusiveWindows(probs, 2)).toEqual([{ channel: 0, start: 60, end: 120 }]);
  });
});

describe('AHC', () => {
  it('stops at tau and then merges down to the cap', () => {
    const e = unit([1, 0], [0.99, 0.1], [0, 1], [0.1, 0.99]);
    expect(Array.from(averageLinkage(e, 4, 0.35, 16, 2))).toEqual([0, 0, 2, 2]);
    expect(new Set(averageLinkage(e, 4, 0.35, 1, 2)).size).toBe(1);
  });

  it('folds clusters under minWindows into the nearest big one', () => {
    const e = unit([1, 0], [1, 0.05], [0.98, 0.1], [0, 1], [0.6, 0.8]);
    const lab = clusterEmbeddings(e, 5, { tau: 0.95, minWindows: 2, maxClusters: 16 } as never, 2);
    expect(Array.from(lab)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('relabelProbs', () => {
  it('maps each frame to its nearest window label and maxes per label', () => {
    const probs = Float32Array.from([0.9, 0, 0.9, 0, 0.8, 0.6, 0, 0.7]);
    const windows = [
      { channel: 0, start: 0, end: 1 },
      { channel: 0, start: 2, end: 3 },
      { channel: 1, start: 3, end: 4 },
    ];
    const out = relabelProbs(probs, 2, windows, Int32Array.from([0, 1, 0]));
    expect(out.numSpeakers).toBe(2);
    expect(Array.from(out.probs)).toEqual([0.9, 0, 0.9, 0, 0.6, 0.8, 0.7, 0].map(Math.fround));
  });

  it('gives a channel without windows its own label', () => {
    const out = relabelProbs(
      Float32Array.from([0.9, 0.5]),
      2,
      [{ channel: 0, start: 0, end: 1 }],
      Int32Array.from([0]),
    );
    expect(out.numSpeakers).toBe(2);
  });
});

describe('RescoreGate', () => {
  it('opens at 7 distinct channels with final turns', () => {
    const gate = new RescoreGate();
    for (let k = 0; k < 6; k += 1) gate.observe(k, true);
    gate.observe(6, false);
    expect(gate.open).toBe(false);
    gate.observe(6, true);
    expect(gate.open).toBe(true);
  });
});
