import { describe, expect, it } from 'vitest';
import { mapTracks } from './overlap-track-map';

const SR = 16_000;
const turns = [
  { speaker: 'system:0', start: 0, end: 2 },
  { speaker: 'system:1', start: 1, end: 3 },
];

function voiced(from: number, to: number, seconds = 3): Float32Array {
  const out = new Float32Array(seconds * SR);
  for (let i = Math.round(from * SR); i < Math.round(to * SR); i += 1) out[i] = 0.3 * Math.sin(i / 7);
  return out;
}

describe('mapTracks', () => {
  const zero = voiced(0, 2);
  const one = voiced(1, 3);

  it('maps each track to the speaker whose turns match its activity', () => {
    expect(mapTracks([zero, one], ['system:0', 'system:1'], turns, 0)?.speakers).toEqual(['system:0', 'system:1']);
  });

  it('flips the permutation when the tracks come out swapped', () => {
    expect(mapTracks([one, zero], ['system:0', 'system:1'], turns, 0)?.speakers).toEqual(['system:1', 'system:0']);
  });

  it('gives up when the tracks carry no speaker-specific activity', () => {
    const both = voiced(0, 3);
    expect(mapTracks([both, both], ['system:0', 'system:1'], turns, 0)).toBeNull();
  });

  it('gives up without enough solo context', () => {
    const tight = [
      { speaker: 'system:0', start: 0, end: 3 },
      { speaker: 'system:1', start: 0.1, end: 3 },
    ];
    expect(mapTracks([zero, one], ['system:0', 'system:1'], tight, 0)).toBeNull();
  });
});
