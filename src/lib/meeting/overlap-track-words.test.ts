import { describe, expect, it } from 'vitest';
import { stampTrackWords } from './overlap-track-words';

const SR = 16_000;
const span = { start: 11, end: 12, speakers: ['system:0', 'system:1'] };

function tone(level: number, seconds = 3): Float32Array {
  return Float32Array.from({ length: seconds * SR }, (_, i) => level * Math.sin(i / 5));
}

function voicedAt(level: number, from: number, to: number, floor = 0): Float32Array {
  return Float32Array.from({ length: 3 * SR }, (_, i) => (i >= from * SR && i < to * SR ? level : floor) * Math.sin(i / 5));
}

describe('stampTrackWords', () => {
  const mix = tone(0.3);

  it('stamps each track missed words with its mapped speaker', () => {
    const words = stampTrackWords(
      [
        { speaker: 'system:1', track: tone(0.2), heard: [{ text: 'yes', start: 11.2, end: 11.4 }] },
        { speaker: 'system:0', track: tone(0.2), heard: [{ text: 'no', start: 11.5, end: 11.7 }] },
      ],
      [],
      span,
      mix,
      10,
    );
    expect(words).toEqual({
      words: [
        { text: 'yes', start: 11.2, end: 11.4, speaker: 'system:1' },
        { text: 'no', start: 11.5, end: 11.7, speaker: 'system:0' },
      ],
      moved: [],
    });
  });

  it('skips words the first pass already has and words outside the span', () => {
    const words = stampTrackWords(
      [
        {
          speaker: 'system:1',
          track: tone(0.2),
          heard: [
            { text: 'well', start: 11.1, end: 11.3 },
            { text: 'after', start: 12.4, end: 12.6 },
          ],
        },
      ],
      [{ text: 'well', start: 11.15, end: 11.35, speaker: 'system:1' }],
      span,
      mix,
      10,
    );
    expect(words).toEqual({ words: [], moved: [] });
  });

  it('drops words whose track sits more than 20 dB below the mix', () => {
    const words = stampTrackWords(
      [{ speaker: 'system:1', track: tone(0.001), heard: [{ text: 'ghost', start: 11.2, end: 11.4 }] }],
      [],
      span,
      mix,
      10,
    );
    expect(words).toEqual({ words: [], moved: [] });
  });

  it('re-attributes a merged first-pass word to the speaker whose track carries it', () => {
    const yes = { text: 'yes', start: 11.5, end: 11.7, speaker: 'system:0' };
    const result = stampTrackWords(
      [
        { speaker: 'system:0', track: voicedAt(0.3, 0, 1.4), heard: [{ text: 'so', start: 11.1, end: 11.3 }] },
        { speaker: 'system:1', track: voicedAt(0.3, 1.4, 3), heard: [{ text: 'yes', start: 11.52, end: 11.72 }] },
      ],
      [{ text: 'so', start: 11.1, end: 11.3, speaker: 'system:0' }, yes],
      span,
      mix,
      10,
    );
    expect(result).toEqual({ words: [{ ...yes, speaker: 'system:1' }], moved: [yes] });
  });

  it('never re-stamps the leader words that leak onto the other track', () => {
    const leader = voicedAt(0.3, 0, 3);
    const leak = voicedAt(0.06, 0, 3);
    const result = stampTrackWords(
      [
        { speaker: 'system:0', track: leader, heard: [{ text: 'well', start: 11.2, end: 11.4 }] },
        {
          speaker: 'system:1',
          track: leak,
          heard: [
            { text: 'well', start: 11.2, end: 11.4 },
            { text: 'okay', start: 11.6, end: 11.8 },
          ],
        },
      ],
      [{ text: 'well', start: 11.2, end: 11.4, speaker: 'system:0' }],
      span,
      mix,
      10,
    );
    expect(result).toEqual({ words: [], moved: [] });
  });
});
