// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_BIAS_STRENGTH, MAX_BIAS_STRENGTH } from './constants';
import {
  addFixedWord,
  addVocabularyEntries,
  addVocabularyVariant,
  getPreparedVocabulary,
  getVocabulary,
  getVocabularyBiasConfig,
  removeVocabularyEntry,
  removeVocabularyVariant,
  renameVocabularyEntry,
  resetVocabularyForTests,
  setVocabularyEntries,
  setVocabularyStrength,
} from './store';
import { applyVocabularyToText } from './replace';

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
});

describe('editing', () => {
  beforeEach(() => {
    setVocabularyEntries([
      { word: 'Framna', variants: ['from now'] },
      { word: 'Hezelaer', variants: [] },
    ]);
  });

  it('renames an entry, keeping its variants', () => {
    expect(renameVocabularyEntry('Hezelaer', '  Hezelaar  ')).toBe('ok');
    expect(getVocabulary().entries[1]).toEqual({ word: 'Hezelaar', variants: [] });
  });

  it('refuses an empty rename and leaves the word alone', () => {
    expect(renameVocabularyEntry('Framna', '   ')).toBe('empty');
    expect(getVocabulary().entries[0].word).toBe('Framna');
  });

  it('refuses a rename onto another entry, in any case', () => {
    expect(renameVocabularyEntry('Framna', 'HEZELAER')).toBe('duplicate');
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
  });

  it('allows a case-only rename of the entry itself', () => {
    expect(renameVocabularyEntry('Framna', 'framna')).toBe('ok');
    expect(getVocabulary().entries[0].word).toBe('framna');
  });

  it('drops a variant that the new spelling makes redundant', () => {
    expect(renameVocabularyEntry('Framna', 'From Now')).toBe('ok');
    expect(getVocabulary().entries[0]).toEqual({ word: 'From Now', variants: [] });
  });

  it('adds a variant, refusing empty, the word itself, and repeats in any case', () => {
    expect(addVocabularyVariant('Framna', '  fram  na ')).toBe('ok');
    expect(getVocabulary().entries[0].variants).toEqual(['from now', 'fram na']);
    expect(addVocabularyVariant('Framna', '')).toBe('empty');
    expect(addVocabularyVariant('Framna', 'framna')).toBe('duplicate');
    expect(addVocabularyVariant('Framna', 'FROM NOW')).toBe('duplicate');
  });

  it('refuses a variant for a word that is not in the list', () => {
    expect(addVocabularyVariant('Nobody', 'x')).toBe('empty');
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
  });

  it('removes one variant, and an entry', () => {
    removeVocabularyVariant('Framna', 'from now');
    expect(getVocabulary().entries[0].variants).toEqual([]);
    removeVocabularyEntry('Hezelaer');
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna']);
  });

  it('removing an unknown word changes nothing', () => {
    removeVocabularyEntry('Nobody');
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
  });
});

describe('strength', () => {
  it('clamps the strength to 0..MAX', () => {
    setVocabularyStrength(1000);
    expect(getVocabulary().strength).toBe(MAX_BIAS_STRENGTH);
    setVocabularyStrength(-1);
    expect(getVocabulary().strength).toBe(0);
  });

  it('treats a non-finite strength (NaN, Infinity) as the default, not as the cap', () => {
    setVocabularyStrength(Number.NaN);
    expect(getVocabulary().strength).toBe(DEFAULT_BIAS_STRENGTH);
    setVocabularyStrength(Number.POSITIVE_INFINITY);
    expect(getVocabulary().strength).toBe(DEFAULT_BIAS_STRENGTH);
  });

  it('sends no words to the decoder at strength 0, and the words otherwise', () => {
    addVocabularyEntries([{ word: 'Framna', variants: [] }]);
    setVocabularyStrength(0);
    expect(getVocabularyBiasConfig()).toEqual({ words: [], strength: 0 });
    setVocabularyStrength(2);
    expect(getVocabularyBiasConfig()).toEqual({ words: ['Framna'], strength: 2 });
  });
});

describe('prepared list cache', () => {
  it('is rebuilt after every change, so the fix-up sees the newest words', () => {
    addVocabularyEntries([{ word: 'Framna', variants: ['from now'] }]);
    expect(applyVocabularyToText('from now', getPreparedVocabulary())).toBe('Framna');
    removeVocabularyVariant('Framna', 'from now');
    expect(applyVocabularyToText('from now', getPreparedVocabulary())).toBe('from now');
  });
});

describe('Fix this word', () => {
  it('saves a misheard spelling that differs only by case as nothing extra', () => {
    expect(addFixedWord('framna', 'Framna')).toBe(true);
    expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: [] }]);
  });

  it('collapses spaces in both the heard text and the spelling', () => {
    addFixedWord('  from   now ', ' Framna  ');
    expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: ['from now'] }]);
  });

  it('adds to an existing word instead of making a second entry', () => {
    addFixedWord('from now', 'Framna');
    addFixedWord('fram na', 'framna');
    expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: ['from now', 'fram na'] }]);
  });
});
