import { describe, expect, it } from 'vitest';
import { LANGID_TOKEN_IDS, LANGID_LANGUAGE_NAMES, LANGID_ID_TO_TOKEN, languageNameFor } from './languages';

describe('language token table', () => {
  it('has exactly 99 languages, matching Whisper\'s multilingual token set', () => {
    expect(Object.keys(LANGID_TOKEN_IDS)).toHaveLength(99);
  });

  it('gives every language code a display name', () => {
    for (const code of Object.keys(LANGID_TOKEN_IDS)) {
      expect(LANGID_LANGUAGE_NAMES[code], `missing display name for "${code}"`).toBeTypeOf('string');
    }
  });

  it('has no duplicate token ids', () => {
    const ids = Object.values(LANGID_TOKEN_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds a working id -> code reverse map', () => {
    for (const [code, id] of Object.entries(LANGID_TOKEN_IDS)) {
      expect(LANGID_ID_TO_TOKEN.get(id)).toBe(code);
    }
  });

  it('falls back to the raw code when a name is unknown', () => {
    expect(languageNameFor('xx')).toBe('xx');
    expect(languageNameFor('en')).toBe('English');
  });
});
