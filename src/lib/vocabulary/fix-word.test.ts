// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { meeting } from '@/lib/meeting';
import { getState } from '@/lib/meeting/store-core';
import { resetSession } from '@/lib/meeting/session-reset';
import { upsertSegment } from '@/lib/meeting/segment-store';
import type { Segment } from '@/lib/meeting/types';
import {
  addFixedWord,
  getVocabulary,
  getVocabularyBiasConfig,
  resetVocabularyForTests,
  setVocabularyStrength,
} from './store';
import { VOCABULARY_STORAGE_KEY } from './vocabulary-storage';

const line = (id: string, text: string, final = true): Segment => ({
  id,
  source: 'mic',
  speaker: 'mic:0',
  text,
  start: 0,
  end: 1,
  final,
});

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
  resetSession('mic');
});

describe('"Fix this word"', () => {
  it('saves the spelling with what the transcript showed, and corrects the open transcript at once', () => {
    upsertSegment(line('a', 'We work at Fromna now.'));
    upsertSegment(line('b', 'Fromna, again.'));
    upsertSegment(line('c', 'Fromna still talking', false));

    meeting.fixWord('Fromna', 'Framna');

    expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: ['Fromna'] }]);
    expect(JSON.parse(localStorage.getItem(VOCABULARY_STORAGE_KEY) ?? '{}').entries).toEqual([
      { word: 'Framna', variants: ['Fromna'] },
    ]);
    const texts = getState().segments.map((s) => s.text);
    expect(texts).toEqual(['We work at Framna now.', 'Framna, again.', 'Fromna still talking']);
  });

  it('fixes lines that finish later too', () => {
    meeting.fixWord('from now ah', 'Framna');
    upsertSegment(line('d', 'Ask from now ah about it'));
    expect(getState().segments[0].text).toBe('Ask Framna about it');
  });

  it('saves nothing for an empty spelling', () => {
    expect(addFixedWord('Fromna', '   ')).toBe(false);
    expect(getVocabulary().entries).toEqual([]);
  });
});

describe('empty word list', () => {
  it('leaves stored lines as the very same objects', () => {
    const seg = line('e', 'Fromna stays as heard.');
    upsertSegment(seg);
    expect(getState().segments[0]).toBe(seg);
    expect(getVocabularyBiasConfig().words).toEqual([]);
  });

  it('sends no words to the decoder when the strength is off', () => {
    addFixedWord('Fromna', 'Framna');
    expect(getVocabularyBiasConfig().words).toEqual(['Framna']);
    setVocabularyStrength(0);
    expect(getVocabularyBiasConfig().words).toEqual([]);
  });
});
