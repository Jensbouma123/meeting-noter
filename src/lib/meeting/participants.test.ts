// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getVocabulary, resetVocabularyForTests } from '@/lib/vocabulary/store';
import {
  getParticipants,
  getRecentParticipants,
  hasAskedParticipants,
  parseParticipantNames,
  setParticipants,
  skipParticipants,
  unassignedParticipants,
} from './participants';

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
});

describe('participants', () => {
  it('splits on commas and trims', () => {
    expect(parseParticipantNames(' Anna ,  Jan  de Vries,, ')).toEqual(['Anna', 'Jan de Vries']);
  });

  it('stores the list on the meeting, without duplicates, and remembers it as recents', () => {
    setParticipants('s1', ['Anna', 'anna', 'Jan']);
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
    expect(getParticipants('s2')).toEqual([]);
    expect(getRecentParticipants()).toEqual(['Anna', 'Jan']);
  });

  it('adds names to the word list through the speaker-name path', () => {
    setParticipants('s1', ['Marieke']);
    expect(getVocabulary().entries.map((e) => e.word)).toContain('Marieke');
  });

  it('skip marks the step as answered without names', () => {
    expect(hasAskedParticipants('s1')).toBe(false);
    skipParticipants('s1');
    expect(hasAskedParticipants('s1')).toBe(true);
    expect(getParticipants('s1')).toEqual([]);
  });

  it('lists participants no speaker carries yet', () => {
    expect(unassignedParticipants(['Anna', 'Jan'], ['anna', 'Speaker 2'])).toEqual(['Jan']);
  });
});
