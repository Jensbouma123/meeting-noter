import { describe, expect, it } from 'vitest';
import type { Segment } from '@/lib/meeting/types';
import { mergeFragments } from './merge-fragments';
import { splitSentences } from './split-sentences';

const seg = (id: string, start: number, text: string, speaker = 'mic:0', final = true): Segment =>
  ({ id, source: 'mic', speaker, text, start, end: start + 2, final });

describe('splitSentences', () => {
  it('splits on punctuation, keeps segment id, speaker and start', () => {
    const out = splitSentences(mergeFragments([seg('a', 5, 'First thing. Second thing? Third')]));
    expect(out.map((s) => s.text)).toEqual(['First thing.', 'Second thing?', 'Third']);
    expect(out[1]).toMatchObject({ segmentId: 'a', speakerId: 'mic:0', start: 5, id: 'a:1' });
  });

  it('joins same-speaker fragments into one sentence attributed to the segment it starts in', () => {
    const out = splitSentences(mergeFragments([
      seg('a', 1, 'Okay.'),
      seg('b', 3, 'Ik stuur de offerte'),
      seg('c', 4, 'morgen naar de klant.'),
      seg('d', 5, 'Klopt.', 'mic:1'),
    ]));
    expect(out.map((s) => [s.text, s.segmentId])).toEqual([
      ['Okay.', 'a'],
      ['Ik stuur de offerte morgen naar de klant.', 'b'],
      ['Klopt.', 'd'],
    ]);
  });

  it('does not join across speakers, long gaps, or after a full stop', () => {
    const out = splitSentences(mergeFragments([
      seg('a', 1, 'We gaan'), seg('b', 2, 'voor optie twee', 'mic:1'), seg('c', 10, 'Klaar.'), seg('d', 11, 'Nieuw'), seg('e', 40, 'veel later'),
    ]));
    expect(out.map((s) => s.text)).toEqual(['We gaan', 'voor optie twee', 'Klaar.', 'Nieuw', 'veel later']);
  });

  it('skips non-final segments and returns nothing for empty input', () => {
    expect(splitSentences(mergeFragments([seg('x', 1, 'skip me', 'mic:0', false)]))).toEqual([]);
    expect(splitSentences([])).toEqual([]);
  });
});
