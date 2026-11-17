import { describe, expect, it } from 'vitest';
import { getServerLanguageSnapshot } from './languageStore';

describe('getServerLanguageSnapshot', () => {
  it('renders Dutch on the server, matching <html lang="nl">', () => {
    expect(getServerLanguageSnapshot()).toBe('nl');
  });
});
