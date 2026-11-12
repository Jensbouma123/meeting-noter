// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BIAS_STRENGTH, MAX_BIAS_STRENGTH } from './bias';
import {
  VOCABULARY_STORAGE_KEY,
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
  subscribeVocabulary,
} from './store';
import { applyVocabularyToText } from './replace';

const stored = () => JSON.parse(localStorage.getItem(VOCABULARY_STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading from localStorage', () => {
  it('starts empty at the default strength when nothing is stored', () => {
    expect(getVocabulary()).toEqual({ entries: [], strength: DEFAULT_BIAS_STRENGTH });
  });

  it('reads back what was saved, after a reload', () => {
    addVocabularyEntries([{ word: 'Framna', variants: ['from now'] }]);
    setVocabularyStrength(2);
    resetVocabularyForTests();
    expect(getVocabulary()).toEqual({ entries: [{ word: 'Framna', variants: ['from now'] }], strength: 2 });
  });

  it('survives malformed JSON without throwing', () => {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, '{not json');
    expect(getVocabulary()).toEqual({ entries: [], strength: DEFAULT_BIAS_STRENGTH });
  });

  it('survives a stored JSON null, or a list instead of an object', () => {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, 'null');
    expect(getVocabulary().entries).toEqual([]);
    resetVocabularyForTests();
    localStorage.setItem(VOCABULARY_STORAGE_KEY, '[1,2]');
    expect(getVocabulary()).toEqual({ entries: [], strength: DEFAULT_BIAS_STRENGTH });
  });

  it('drops hostile or broken entries and keeps the rest', () => {
    localStorage.setItem(
      VOCABULARY_STORAGE_KEY,
      JSON.stringify({
        entries: [
          null,
          'Framna',
          42,
          { word: 7, variants: [] },
          { word: '   ' },
          { word: '  Hezelaer  ', variants: ['  hezelar ', 9, null] },
          { word: 'Jira', variants: 'not a list', source: 'bogus' },
          { word: 'Framna', variants: ['from now'] },
        ],
        strength: 1,
      }),
    );
    expect(getVocabulary().entries).toEqual([
      { word: 'Hezelaer', variants: ['hezelar'] },
      { word: 'Jira', variants: [] },
      { word: 'Framna', variants: ['from now'] },
    ]);
  });

  it('keeps the meeting marker only when it says "meeting"', () => {
    localStorage.setItem(
      VOCABULARY_STORAGE_KEY,
      JSON.stringify({
        entries: [
          { word: 'Anna', variants: [], source: 'meeting' },
          { word: 'Bo', variants: [], source: 'other' },
        ],
        strength: 3,
      }),
    );
    expect(getVocabulary().entries).toEqual([
      { word: 'Anna', variants: [], source: 'meeting' },
      { word: 'Bo', variants: [] },
    ]);
  });

  it('clamps a stored strength that is out of range, and replaces a non-number with the default', () => {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify({ entries: [], strength: 99 }));
    expect(getVocabulary().strength).toBe(MAX_BIAS_STRENGTH);
    resetVocabularyForTests();
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify({ entries: [], strength: -4 }));
    expect(getVocabulary().strength).toBe(0);
    resetVocabularyForTests();
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify({ entries: [], strength: 'loud' }));
    expect(getVocabulary().strength).toBe(DEFAULT_BIAS_STRENGTH);
  });
});

describe('saving', () => {
  it('writes the whole state under its own key', () => {
    addVocabularyEntries([{ word: 'Jira', variants: [] }]);
    expect(stored()).toEqual({ entries: [{ word: 'Jira', variants: [] }], strength: DEFAULT_BIAS_STRENGTH });
  });

  it('keeps the in-page list when localStorage refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => addVocabularyEntries([{ word: 'Jira', variants: [] }])).not.toThrow();
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Jira']);
  });

  it('notifies subscribers on every change, and not after unsubscribing', () => {
    const fn = vi.fn();
    const off = subscribeVocabulary(fn);
    addVocabularyEntries([{ word: 'Jira', variants: [] }]);
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    setVocabularyStrength(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('replaces the whole list with setVocabularyEntries, merging duplicates', () => {
    addVocabularyEntries([{ word: 'Old', variants: [] }]);
    setVocabularyEntries([
      { word: 'Framna', variants: ['from now'] },
      { word: 'framna', variants: ['Fromna'] },
    ]);
    expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: ['from now', 'Fromna'] }]);
  });
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
