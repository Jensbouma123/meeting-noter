import { describe, expect, it } from 'vitest';
import { formatWordCsv, formatWordList, mergeEntries, parseWordCsv, parseWordFile, parseWordList } from './text-format';

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

describe('parseWordCsv', () => {
  it('skips the header and reads quoted cells', () => {
    const csv = '﻿word,heard as\nFramna,"from now; Fromna"\n"Acme, Inc",\nJira\n';
    expect(parseWordCsv(csv)).toEqual([
      { word: 'Framna', variants: ['from now', 'Fromna'] },
      { word: 'Acme, Inc', variants: [] },
      { word: 'Jira', variants: [] },
    ]);
  });

  it('round-trips with formatWordCsv', () => {
    const entries = [
      { word: 'Acme, Inc', variants: ['acme ink'] },
      { word: 'Say "hi"', variants: [] },
    ];
    expect(parseWordCsv(formatWordCsv(entries))).toEqual(entries);
  });

  it('is picked by file name', () => {
    expect(parseWordFile('words.CSV', 'word,heard as\nA b,c')).toEqual([{ word: 'A b', variants: ['c'] }]);
    expect(parseWordFile('words.txt', 'A, b')).toHaveLength(2);
  });
});

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
