import { describe, expect, it } from 'vitest';
import { formatWordList } from './format-word-list';
import { parseWordList } from './parse-word-list';

describe('parseWordList (the paste box and .txt files)', () => {
  it('takes one word per line and comma-separated words, trimming and de-duplicating', () => {
    expect(parseWordList('Framna, Hezelaer\n  Acme Cloud \n\nframna\nkubectl;Jira')).toEqual([
      { word: 'Framna', variants: [] },
      { word: 'Hezelaer', variants: [] },
      { word: 'Acme Cloud', variants: [] },
      { word: 'kubectl', variants: [] },
      { word: 'Jira', variants: [] },
    ]);
  });

  it('reads "word = misheard; misheard" lines', () => {
    expect(parseWordList('Framna = from now; Fromna\nHezelaer=Hezelar')).toEqual([
      { word: 'Framna', variants: ['from now', 'Fromna'] },
      { word: 'Hezelaer', variants: ['Hezelar'] },
    ]);
  });

  it('finds nothing in blank input', () => {
    expect(parseWordList(' \n , ,\n')).toEqual([]);
  });

  it('round-trips with formatWordList', () => {
    const entries = [
      { word: 'Framna', variants: ['from now', 'Fromna'] },
      { word: 'Jira', variants: [] },
    ];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
  });
});
