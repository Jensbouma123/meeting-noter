// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getVocabulary, resetVocabularyForTests } from '@/lib/vocabulary/store';
import {
  MAX_RECENT_PARTICIPANTS,
  RECENT_PARTICIPANTS_KEY,
  adoptParticipants,
  getParticipants,
  getRecentParticipants,
  getStoredParticipants,
  hasAskedParticipants,
  isSessionParticipantsKey,
  isUnnamedSpeakerLabel,
  parseParticipantNames,
  removeParticipants,
  sessionParticipantsKey,
  setParticipants,
  skipParticipants,
  uniqueNames,
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

  it('also splits on semicolons and newlines, and caps a name at 40 characters', () => {
    expect(parseParticipantNames('Anna;Jan\nPiet')).toEqual(['Anna', 'Jan', 'Piet']);
    const long = 'x'.repeat(60);
    expect(parseParticipantNames(long)).toEqual(['x'.repeat(40)]);
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

describe('null versus empty list', () => {
  it('reads null when the question was never answered, and [] once skipped', () => {
    expect(getStoredParticipants('s1')).toBeNull();
    skipParticipants('s1');
    expect(getStoredParticipants('s1')).toEqual([]);
  });

  it('a skip after an answer keeps the answer', () => {
    setParticipants('s1', ['Anna']);
    skipParticipants('s1');
    expect(getStoredParticipants('s1')).toEqual(['Anna']);
  });

  it('an empty answer does not overwrite the recent names', () => {
    setParticipants('s1', ['Anna']);
    setParticipants('s2', []);
    expect(getRecentParticipants()).toEqual(['Anna']);
  });

  it('adopting null clears the local copy (the caller decides whether to call it)', () => {
    setParticipants('s1', ['Anna']);
    adoptParticipants('s1', null);
    expect(getStoredParticipants('s1')).toBeNull();
    expect(hasAskedParticipants('s1')).toBe(false);
  });

  it('adopting a list stores it cleaned, without adding recents or vocabulary', () => {
    adoptParticipants('s1', ['Anna', 'anna', ' Jan ']);
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
    expect(getRecentParticipants()).toEqual([]);
    expect(getVocabulary().entries).toEqual([]);
  });

  it('removing the copy makes the question come back', () => {
    skipParticipants('s1');
    removeParticipants('s1');
    expect(hasAskedParticipants('s1')).toBe(false);
    expect(getStoredParticipants('s1')).toBeNull();
  });
});

describe('recent names', () => {
  it('lists the newest first, and a name used again moves to the front', () => {
    setParticipants('s1', ['A']);
    setParticipants('s2', ['B']);
    setParticipants('s3', ['A']);
    expect(getRecentParticipants()).toEqual(['A', 'B']);
  });

  it('keeps only the newest MAX_RECENT_PARTICIPANTS', () => {
    for (let i = 0; i < MAX_RECENT_PARTICIPANTS + 1; i += 1) setParticipants(`s${i}`, [`Name${i}`]);
    const recent = getRecentParticipants();
    expect(recent).toHaveLength(MAX_RECENT_PARTICIPANTS);
    expect(recent[0]).toBe(`Name${MAX_RECENT_PARTICIPANTS}`);
    expect(recent).not.toContain('Name0');
  });
});

describe('storage keys', () => {
  it('per-meeting lists are swept, the recents list is not', () => {
    expect(isSessionParticipantsKey(sessionParticipantsKey('s1'))).toBe(true);
    expect(isSessionParticipantsKey(RECENT_PARTICIPANTS_KEY)).toBe(false);
    expect(isSessionParticipantsKey('mn.session.s1.v1')).toBe(false);
  });
});

describe('uniqueNames', () => {
  it('drops blanks and case-insensitive repeats, keeps the first spelling, collapses spaces', () => {
    expect(uniqueNames(['  Jan   de  Vries ', 'jan de vries', '', ' ', 'Anna'])).toEqual(['Jan de Vries', 'Anna']);
  });
});

describe('isUnnamedSpeakerLabel', () => {
  it('is true for the labels the app hands out, in both languages', () => {
    expect(isUnnamedSpeakerLabel('Speaker 2')).toBe(true);
    expect(isUnnamedSpeakerLabel('Spreker 3')).toBe(true);
    expect(isUnnamedSpeakerLabel('Speaker')).toBe(true);
  });

  it('is false for a typed name', () => {
    expect(isUnnamedSpeakerLabel('Anna')).toBe(false);
    expect(isUnnamedSpeakerLabel('You')).toBe(false);
  });
});
