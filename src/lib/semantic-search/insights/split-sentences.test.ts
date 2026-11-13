import { describe, expect, it } from 'vitest';
import type { Segment } from '@/lib/meeting/types';
import { splitSentences } from './split-sentences';

const seg = (id: string, start: number, text: string, final = true): Segment => ({ id, source: 'mic', speaker: 'mic:0', text, start, end: start + 2, final });

describe('splitSentences', () => {
  it('splits on punctuation, keeps segment id, speaker and start', () => {
    const out = splitSentences([seg('a', 5, 'First thing. Second thing? Third')]);
    expect(out.map((s) => s.text)).toEqual(['First thing.', 'Second thing?', 'Third']);
    expect(out[1]).toMatchObject({ segmentId: 'a', speakerId: 'mic:0', start: 5, id: 'a:1' });
  });

  it('keeps unpunctuated text whole, skips non-final, orders by start', () => {
    const out = splitSentences([seg('b', 9, 'no punctuation here at all'), seg('c', 1, 'skip me', false), seg('a', 2, 'early one')]);
    expect(out.map((s) => s.segmentId)).toEqual(['a', 'b']);
  });

  it('returns nothing for empty input', () => {
    expect(splitSentences([])).toEqual([]);
  });
});
