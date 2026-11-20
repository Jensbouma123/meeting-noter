import { describe, expect, it } from 'vitest';
import { stampTrackWords } from './overlap-track-words';

const SR = 16_000;
const span = { start: 11, end: 12, speakers: ['system:0', 'system:1'] };

function tone(level: number, seconds = 3): Float32Array {
  return Float32Array.from({ length: seconds * SR }, (_, i) => level * Math.sin(i / 5));
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
    expect(words).toEqual([
      { text: 'yes', start: 11.2, end: 11.4, speaker: 'system:1' },
      { text: 'no', start: 11.5, end: 11.7, speaker: 'system:0' },
    ]);
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
      [{ text: 'well', start: 11.15, end: 11.35, speaker: 'system:0' }],
      span,
      mix,
      10,
    );
    expect(words).toEqual([]);
  });

  it('drops words whose track sits more than 20 dB below the mix', () => {
    const words = stampTrackWords(
      [{ speaker: 'system:1', track: tone(0.001), heard: [{ text: 'ghost', start: 11.2, end: 11.4 }] }],
      [],
      span,
      mix,
      10,
    );
    expect(words).toEqual([]);
  });
});
