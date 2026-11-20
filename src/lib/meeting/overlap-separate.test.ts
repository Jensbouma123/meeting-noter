import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetSeparation, separateOverlap, separationStats } from './overlap-separate';
import type { AudioAt, TranscribeClip } from './types/overlap-retranscribe';
import type { OverlapSeparator } from './types/overlap-separate';

const SR = 16_000;
const span = { start: 1, end: 2, speakers: ['system:0', 'system:1'] };
const turns = [
  { speaker: 'system:0', start: 0, end: 2 },
  { speaker: 'system:1', start: 1, end: 3 },
];

function voiced(from: number, to: number, seconds = 3): Float32Array {
  const out = new Float32Array(seconds * SR);
  for (let i = Math.round(from * SR); i < Math.round(to * SR); i += 1) out[i] = 0.3 * Math.sin(i / 7);
  return out;
}

const trackA = voiced(0, 2);
const trackB = voiced(1, 3);
const mix = trackA.map((v, i) => v + trackB[i]);
const audioAt: AudioAt = () => ({ audio: mix, start: 0.5 });

function separator(tracks: [Float32Array, Float32Array] = [trackB, trackA]): OverlapSeparator {
  return { name: 'fake', backend: () => 'webgpu', separate: vi.fn(async () => tracks) };
}

const transcribe: TranscribeClip = async (track) =>
  track === trackA ? [{ text: 'alpha', start: 0.8, end: 1.1 }] : [{ text: 'bravo', start: 0.9, end: 1.2 }];

describe('separateOverlap', () => {
  afterEach(() => resetSeparation());

  it('stamps each track word with the speaker its envelope maps to, offset by the clip start', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const shifted = { ...span, start: 1, end: 2 };
    const words = await separateOverlap(shifted, 'system', [], turns.map((t) => ({ ...t, start: t.start + 0.5, end: t.end + 0.5 })), audioAt, transcribe, separator());
    expect(words).toEqual([
      { text: 'alpha', start: 1.3, end: 1.6, speaker: 'system:0' },
      { text: 'bravo', start: 1.4, end: 1.7, speaker: 'system:1' },
    ]);
    expect(separationStats().outcomes).toEqual({ separated: 1 });
    expect(separationStats().clips[0]).toMatchObject({ seconds: 3, backend: 'webgpu' });
  });

  it('returns null and counts the reason when the gate refuses', async () => {
    const sep = separator();
    expect(await separateOverlap(span, 'mic', [], turns, audioAt, transcribe, sep)).toBeNull();
    expect(sep.separate).not.toHaveBeenCalled();
    expect(separationStats().outcomes).toEqual({ source: 1 });
  });

  it('returns null when the tracks cannot be mapped', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const silent = new Float32Array(3 * SR);
    expect(await separateOverlap(span, 'system', [], turns, audioAt, transcribe, separator([silent, silent]))).toBeNull();
    expect(separationStats().outcomes).toEqual({ unmapped: 1 });
  });

  it('returns null and frees the gate when the separator throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sep: OverlapSeparator = { name: 'x', backend: () => 'webgpu', separate: async () => { throw new Error('gpu lost'); } };
    expect(await separateOverlap(span, 'system', [], turns, audioAt, transcribe, sep)).toBeNull();
    expect(await separateOverlap(span, 'system', [], turns, audioAt, transcribe, sep)).toBeNull();
    expect(separationStats().outcomes).toEqual({ error: 2 });
  });
});
