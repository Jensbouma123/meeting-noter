import { describe, expect, it } from 'vitest';
import { prepareVocabulary } from './prepare-vocabulary';
import { applyVocabularyToSegment, applyVocabularyToText } from './replace';

const vocab = prepareVocabulary([
  { word: 'Framna', variants: ['from now ah', 'fram na'] },
  { word: 'Hezelaer', variants: [] },
  { word: 'kubectl', variants: ['cube cuddle'] },
]);
const fix = (text: string) => applyVocabularyToText(text, vocab);

describe('replace edge cases', () => {
  it('keeps a word-final period that the user typed once, not twice', () => {
    const v = prepareVocabulary([{ word: 'Acme Inc.', variants: ['acme ink'] }]);
    expect(applyVocabularyToText('we are Acme Inc. today', v)).toBe('we are Acme Inc. today');
  });

  it('keeps the period of an entry like "Dr." when a speaker name adds it as a word', () => {
    const v = prepareVocabulary([{ word: 'Dr.', variants: [] }]);
    expect(applyVocabularyToText('Dr. Smith said so', v)).toBe('Dr. Smith said so');
  });

  it('does not rewrite a standalone letter because an entry carries a symbol ("C#")', () => {
    const v = prepareVocabulary([{ word: 'C#', variants: [] }]);
    expect(applyVocabularyToText('take vitamin C daily', v)).toBe('take vitamin C daily');
  });

  it('matches a word inside curly quotes and keeps the quotes', () => {
    expect(fix('said “fram na” twice')).toBe('said “Framna” twice');
  });

  it('matches and keeps a possessive', () => {
    expect(fix("fram na's plan")).toBe("Framna's plan");
  });

  it('matches unicode words in any case and keeps the user spelling', () => {
    const v = prepareVocabulary([{ word: 'Zoë', variants: ['zoe ik'] }]);
    expect(applyVocabularyToText('met zoe ik', v)).toBe('met Zoë');
    expect(applyVocabularyToText('met ZOË', v)).toBe('met Zoë');
  });

  it('a multi-word near-miss must have the same number of words', () => {
    const v = prepareVocabulary([{ word: 'Acme Cloud', variants: [] }]);
    expect(applyVocabularyToText('Acme Clowd', v)).toBe('Acme Cloud');
    expect(applyVocabularyToText('Acmeclowd', v)).toBe('Acmeclowd');
  });

  it('prefers the longest heard-as spelling when two entries start at the same word', () => {
    const v = prepareVocabulary([
      { word: 'Framna', variants: ['from now'] },
      { word: 'Now', variants: ['now ok'] },
    ]);
    expect(applyVocabularyToText('from now ok', v)).toBe('Framna ok');
  });

  it('a long transcript keeps every match and leaves the rest alone', () => {
    const words = Array.from({ length: 5000 }, (_, i) => (i % 500 === 0 ? 'from now ah' : `word${i}`));
    const out = applyVocabularyToText(words.join(' '), vocab).split(' ');
    expect(out.filter((w) => w === 'Framna')).toHaveLength(10);
    expect(out.filter((w) => w === 'from')).toHaveLength(0);
    expect(out[1]).toBe('word1');
  });

  it('applies the list to a segment whose words are missing (no words array)', () => {
    const out = applyVocabularyToSegment({ text: 'fram na' }, vocab);
    expect(out).toEqual({ text: 'Framna' });
  });

  it('keeps a possessive on a near-miss and does not strip "\'s" from other words', () => {
    expect(fix("Fromna's plan")).toBe("Framna's plan");
    expect(fix("it's fine")).toBe("it's fine");
  });

  it('an entry with edge punctuation only matches text that carries it', () => {
    const v = prepareVocabulary([{ word: 'Dr.', variants: [] }]);
    expect(applyVocabularyToText('dr. who', v)).toBe('Dr. who');
    expect(applyVocabularyToText('the dr who', v)).toBe('the dr who');
  });
});
