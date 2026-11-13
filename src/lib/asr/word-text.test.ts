import { describe, expect, it } from 'vitest';
import { agreedPrefix, cleanWords, hasSpeech } from './word-text';

describe('word helpers', () => {
  it('folds punctuation onto the word before it and drops a lone "."', () => {
    expect(cleanWords([{ text: '.' }, { text: 'hello' }, { text: ',' }, { text: 'world' }, { text: '?' }])).toEqual([
      { text: 'hello,' },
      { text: 'world?' },
    ]);
    expect(cleanWords([{ text: '.' }, { text: ' ' }])).toEqual([]);
  });

  it('knows punctuation is not speech', () => {
    expect(hasSpeech('. . ,')).toBe(false);
    expect(hasSpeech('Oké.')).toBe(true);
    expect(hasSpeech('42')).toBe(true);
  });

  it('agrees on words regardless of case and punctuation', () => {
    expect(agreedPrefix([{ text: 'Hello,' }, { text: 'there' }], [{ text: 'hello' }, { text: 'there.' }, { text: 'x' }])).toBe(2);
    expect(agreedPrefix([{ text: 'a' }, { text: 'b' }], [{ text: 'a' }, { text: 'c' }])).toBe(1);
  });
});
