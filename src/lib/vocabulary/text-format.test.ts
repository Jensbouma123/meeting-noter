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

describe('import and export edge cases', () => {
  it('reads a CSV with a blank first line and still skips the header', () => {
    expect(parseWordCsv('\nword,heard as\nFramna,from now\n')).toEqual([{ word: 'Framna', variants: ['from now'] }]);
  });

  it('reads CRLF line endings and empty cells', () => {
    expect(parseWordCsv('word,heard as\r\nFramna,\r\nJira,;;\r\n')).toEqual([
      { word: 'Framna', variants: [] },
      { word: 'Jira', variants: [] },
    ]);
  });

  it('does not throw on an unclosed quote; the rest of the line is the cell', () => {
    expect(parseWordCsv('"Acme, Inc,x\nJira')).toEqual([
      { word: 'Acme, Inc,x', variants: [] },
      { word: 'Jira', variants: [] },
    ]);
  });

  it('reads an empty or whitespace-only file as no words', () => {
    expect(parseWordCsv('')).toEqual([]);
    expect(parseWordCsv('word,heard as\n\n   \n')).toEqual([]);
    expect(parseWordFile('x.txt', '')).toEqual([]);
  });

  it('keeps a word with a comma through a .txt export and re-import (the import reads it from .csv)', () => {
    const entries = [{ word: 'Acme, Inc', variants: [] }];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
  });

  it('keeps a word with an "=" through a .txt export and re-import', () => {
    const entries = [{ word: 'A=B', variants: [] }];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
  });

  it('keeps a word with a semicolon through a .txt export and re-import', () => {
    const entries = [{ word: 'Q;A', variants: [] }];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
  });

  it('exports a .csv with quotes, commas and semicolons in the word losslessly', () => {
    const entries = [{ word: 'O\'Brien "Bo"; Jr', variants: ['o brien bo', 'a,b'] }];
    expect(parseWordCsv(formatWordCsv(entries))).toEqual(entries);
  });

  it('a header-looking first word that is a real word is still read when it is not the header', () => {
    expect(parseWordCsv('Framna,x\nword,y')).toEqual([
      { word: 'Framna', variants: ['x'] },
      { word: 'word', variants: ['y'] },
    ]);
  });

  it('round-trips a quoted word with quotes and variants, and several quoted words on one line', () => {
    const entries = [{ word: 'He said "hi", ok', variants: ['x; y'.split('; ')[0], 'y'] }];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
    expect(parseWordList('"A,B", "C;D", plain')).toEqual([
      { word: 'A,B', variants: [] },
      { word: 'C;D', variants: [] },
      { word: 'plain', variants: [] },
    ]);
  });

  it('treats an unterminated quote as plain text without throwing', () => {
    expect(parseWordList('"Acme')).toEqual([{ word: '"Acme', variants: [] }]);
  });

  it('keeps a misheard variant with ";" or "|" whole through a .txt export and re-import', () => {
    const entries = [{ word: 'Framna', variants: ['from; now', 'fram|na', 'back\\slash\\', 'C:\\new'] }];
    expect(parseWordList(formatWordList(entries))).toEqual(entries);
  });

  it('keeps a misheard variant with ";" or "|" through a .csv export and re-import', () => {
    const entries = [{ word: 'Framna', variants: ['from; now', 'fram|na', 'a\\;b', 'x\\'] }];
    expect(parseWordCsv(formatWordCsv(entries))).toEqual(entries);
  });

  it('reads backslash-escaped separators in variants and leaves other backslashes alone', () => {
    expect(parseWordList('Framna = from\\; now | fram\\|na; C:\\new; a\\\\; b')).toEqual([
      { word: 'Framna', variants: ['from; now', 'fram|na', 'C:\\new', 'a\\', 'b'] },
    ]);
  });

  it('keeps existing unescaped files working (plain "|" and ";" still separate variants)', () => {
    expect(parseWordList('Framna = from now; Fromna | Frammna')).toEqual([
      { word: 'Framna', variants: ['from now', 'Fromna', 'Frammna'] },
    ]);
  });
});
