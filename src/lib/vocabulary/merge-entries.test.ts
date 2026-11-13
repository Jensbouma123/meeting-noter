import { describe, expect, it } from 'vitest';
import { mergeEntries } from './merge-entries';

describe('mergeEntries', () => {
  it('adds new variants to an existing word (any case) and appends new words', () => {
    expect(
      mergeEntries(
        [{ word: 'Framna', variants: ['from now'] }],
        [
          { word: 'framna', variants: ['From now', 'Fromna', 'framna'] },
          { word: 'Jira', variants: [] },
        ],
      ),
    ).toEqual([
      { word: 'Framna', variants: ['from now', 'Fromna'] },
      { word: 'Jira', variants: [] },
    ]);
  });
});
