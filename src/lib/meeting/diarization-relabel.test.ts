import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, setState, subscribe } from './store-core';
import { relabelSource } from './diarization-relabel';
import { upsertSegment } from './segment-store';
import * as family from './speaker-family';
import * as lookup from './diarization-speaker-lookup';
import { ensureSpeaker } from './speaker-registry';

vi.mock('./diarization-speaker-lookup', () => ({
  speakerFor: vi.fn(() => 'mic:9'),
  speakerNear: vi.fn(() => 'mic:9'),
}));
vi.mock('./diarization-overlaps', () => ({ overlapsIn: () => [] }));

const COUNT = 300;

beforeEach(() => {
  setState({ segments: [] });
  for (let i = 0; i < COUNT; i += 1) {
    upsertSegment({ id: `s${i}`, source: 'mic', speaker: 'mic:0', text: `w${i}`, start: i * 2, end: i * 2 + 1, final: true });
  }
  ensureSpeaker('mic:9', 'both');
  vi.clearAllMocks();
});

describe('relabelSource', () => {
  it('relabels every segment with one store notification', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const before = getState();
    relabelSource('mic');
    unsubscribe();
    expect(getState()).not.toBe(before);
    expect(getState().segments.map((s) => s.speaker)).toEqual(Array(COUNT).fill('mic:9'));
    expect(getState().segments.map((s) => s.id)).toEqual(Array.from({ length: COUNT }, (_, i) => `s${i}`));
    expect(listener.mock.calls.length).toBe(1);
  });

  it('scans segments linearly instead of once per family root', () => {
    const rootOf = vi.spyOn(family, 'segmentFamilyRoot');
    relabelSource('mic');
    expect(rootOf.mock.calls.length).toBeLessThan(COUNT * 4);
    expect(lookup.speakerFor).toHaveBeenCalled();
  });
});
