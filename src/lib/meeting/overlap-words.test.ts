import { describe, expect, it } from 'vitest';
import { RETRANSCRIBE_PAD_SECONDS, quieterSpeaker, retranscribeOverlap } from './overlap-clip-pass';
import { missedWords } from './overlap-missed-words';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { overlapSpans } from './overlap-spans';
import type { AttributedWord, OverlapTurn, TranscribeClip } from './types/overlap-retranscribe';

const SR = 16_000;

function word(text: string, start: number, end = start + 0.3, speaker = 'mic:0'): AttributedWord {
  return { text, start, end, speaker };
}

describe('overlapSpans', () => {
  it('finds each stretch of two or more speakers at least the minimum long, and who talks in it', () => {
    const turns: OverlapTurn[] = [
      { speaker: 'a', start: 0, end: 5 },
      { speaker: 'b', start: 4, end: 8 },
      { speaker: 'a', start: 7.7, end: 10 },
    ];
    expect(overlapSpans(turns)).toEqual([{ start: 4, end: 5, speakers: ['a', 'b'] }]);
    expect(overlapSpans(turns, 0.2)).toHaveLength(2);
  });

  it('does not count a turn that ends where the next begins', () => {
    expect(overlapSpans([{ speaker: 'a', start: 0, end: 2 }, { speaker: 'b', start: 2, end: 4 }], 0)).toEqual([]);
  });
});

describe('missedWords', () => {
  const span = { start: 10, end: 12, speakers: ['a', 'b'] };

  it('keeps the second pass words inside the span that the first pass does not have', () => {
    const first = [word('so', 10.1), word('we', 10.5)];
    const second = [word('So', 10.2), word('yeah', 10.4), word('we', 10.6), word('agree', 12.5)];
    expect(missedWords(first, second, span).map((w) => w.text)).toEqual(['yeah']);
  });

  it('lets one first-pass word vouch for one second-pass word only', () => {
    const second = [word('yeah', 10.2), word('yeah', 10.6)];
    expect(missedWords([word('yeah', 10.3)], second, span).map((w) => w.start)).toEqual([10.6]);
  });

  it('adds the same word when the first pass has it too far away', () => {
    expect(missedWords([word('no', 10)], [word('no', 11.5)], span)).toHaveLength(1);
  });

  it('adds nothing of a phrase the first pass has, placed over a second off', () => {
    const text = ['I', 'I', 'literally', 'this', 'might', 'no'];
    const first = text.map((t, i) => word(t, 10 + i * 0.25));
    const second = [word('So', 10.6), ...text.map((t, i) => word(t, 10.9 + i * 0.15))];
    expect(missedWords(first, second, span).map((w) => w.text)).toEqual(['So']);
  });
});

describe('quieterSpeaker', () => {
  const span = { start: 10, end: 12, speakers: ['a', 'b'] };
  const turns: OverlapTurn[] = [
    { speaker: 'a', start: 5, end: 12 },
    { speaker: 'b', start: 10, end: 15 },
  ];

  it('is the overlap speaker fewest first-pass words are attributed to', () => {
    expect(quieterSpeaker(span, [word('x', 10.2, 10.4, 'b'), word('y', 10.8, 11, 'b')], turns)).toBe('a');
    expect(quieterSpeaker(span, [word('x', 10.2, 10.4, 'a')], turns)).toBe('b');
  });

  it('with no words to go by, is the speaker with the most turn time in the span', () => {
    expect(quieterSpeaker({ ...span, end: 11 }, [], [...turns, { speaker: 'b', start: 9, end: 11 }])).toBe('b');
  });
});

describe('retranscribeOverlap', () => {
  it('transcribes the padded span and places the words it adds on the source clock, under the quieter speaker', async () => {
    const span = { start: 10, end: 12, speakers: ['a', 'b'] };
    const turns: OverlapTurn[] = [
      { speaker: 'a', start: 5, end: 12 },
      { speaker: 'b', start: 10, end: 15 },
    ];
    const asked: [number, number][] = [];
    const audioAt = (start: number, end: number) => {
      asked.push([start, end]);
      return { audio: new Float32Array(Math.round((end - start) * SR)), start };
    };
    const transcribe: TranscribeClip = async () => [
      { text: 'we', start: 0.4, end: 0.6 },
      { text: 'yes', start: 1.0, end: 1.2 },
    ];
    const added = await retranscribeOverlap(span, [word('we', 10.1, 10.3, 'a')], turns, audioAt, transcribe);
    expect(asked).toEqual([[10 - RETRANSCRIBE_PAD_SECONDS, 12 + RETRANSCRIBE_PAD_SECONDS]]);
    expect(added.map((w) => [w.text, w.speaker])).toEqual([['yes', 'b']]);
    expect(added[0].start).toBeCloseTo(10.7);
    expect(added[0].end).toBeCloseTo(10.9);
  });
});

describe('isOverlapPassSegment', () => {
  it('knows the pass segments, also under an appended recording prefix', () => {
    expect(isOverlapPassSegment('ovl-3')).toBe(true);
    expect(isOverlapPassSegment('a2:ovl-3')).toBe(true);
    expect(isOverlapPassSegment('live-3')).toBe(false);
  });
});
