import { describe, expect, it } from 'vitest';
import { translations } from './index';

describe('i18n catalogs', () => {
  it('has matching English and Dutch keys in every namespace', () => {
    for (const [namespace, catalog] of Object.entries(translations)) {
      expect(Object.keys(catalog.nl).sort(), namespace).toEqual(Object.keys(catalog.en).sort());
    }
  });
});
