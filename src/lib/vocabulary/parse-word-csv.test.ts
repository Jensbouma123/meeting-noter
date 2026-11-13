import { describe, expect, it } from 'vitest';
import { formatWordCsv } from './format-word-list';
import { parseWordCsv } from './parse-word-csv';
import { parseWordFile } from './parse-word-file';

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
