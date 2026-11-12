// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addNameToVocabulary, nameVocabularyWords } from './names';
import { addVocabularyEntries, getVocabulary, resetVocabularyForTests } from './store';

const words = () => getVocabulary().entries.map((e) => e.word);

describe('addNameToVocabulary', () => {
  beforeEach(() => {
    localStorage.clear();
    resetVocabularyForTests();
  });

  it('adds a single name marked as from a meeting', () => {
    expect(addNameToVocabulary('Marieke')).toBe(1);
    expect(getVocabulary().entries).toEqual([{ word: 'Marieke', variants: [], source: 'meeting' }]);
  });

  it('skips default labels and names under 2 letters', () => {
    for (const n of ['Speaker 1', 'Spreker 2', 'You', 'A', ' ', '']) expect(addNameToVocabulary(n)).toBe(0);
    expect(words()).toEqual([]);
  });

  it('adds full name plus parts of 3+ letters', () => {
    addNameToVocabulary('Jan de Vries');
    expect(words()).toEqual(['Jan de Vries', 'Jan', 'Vries']);
  });

  it('dedupes case-insensitively and keeps existing entries untouched', () => {
    addVocabularyEntries([{ word: 'marieke', variants: ['maria ka'] }]);
    expect(addNameToVocabulary('Marieke')).toBe(0);
    expect(getVocabulary().entries).toEqual([{ word: 'marieke', variants: ['maria ka'] }]);
  });

  it('keeps the old name when a speaker is renamed', () => {
    addNameToVocabulary('Marieke');
    addNameToVocabulary('Marika');
    expect(words()).toEqual(['Marieke', 'Marika']);
  });

  it('nameVocabularyWords drops short parts', () => {
    expect(nameVocabularyWords('Li Wu')).toEqual(['Li Wu']);
  });
});
