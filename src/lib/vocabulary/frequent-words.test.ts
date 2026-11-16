import { describe, expect, it } from 'vitest';
import { isFrequentWord } from './frequent-words';
import { prepareVocabulary } from './prepare-vocabulary';
import { applyVocabularyToText } from './replace';

const vocab = prepareVocabulary([
  { word: 'Waran', variants: [] },
  { word: 'Hezelaer', variants: [] },
]);
const fix = (text: string) => applyVocabularyToText(text, vocab);

describe('frequent-word guard', () => {
  it('knows common Dutch and English words, not names', () => {
    expect(isFrequentWord('waren')).toBe(true);
    expect(isFrequentWord('because')).toBe(true);
    expect(isFrequentWord('hezelair')).toBe(false);
  });

  it('does not replace a frequent word that is merely close to a glossary term', () => {
    expect(fix('Ze waren er allemaal.')).toBe('Ze waren er allemaal.');
  });

  it('still fixes a real misheard name', () => {
    expect(fix('I spoke with Hezelair.')).toBe('I spoke with Hezelaer.');
  });

  it('leaves exact spellings of a glossary term unaffected', () => {
    expect(fix('Zie Waran daar.')).toBe('Zie Waran daar.');
    expect(fix('waran')).toBe('Waran');
  });
});
