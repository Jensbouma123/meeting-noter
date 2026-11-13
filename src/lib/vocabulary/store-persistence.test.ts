// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BIAS_STRENGTH, MAX_BIAS_STRENGTH } from './constants';
import {
  addVocabularyEntries,
  getVocabulary,
  resetVocabularyForTests,
  setVocabularyEntries,
  setVocabularyStrength,
  subscribeVocabulary,
} from './store';
import { VOCABULARY_STORAGE_KEY } from './vocabulary-storage';

const stored = () => JSON.parse(localStorage.getItem(VOCABULARY_STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
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
