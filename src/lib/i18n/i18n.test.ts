import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translations } from './index';

describe('i18n catalogs', () => {
  it('has matching English and Dutch keys in every namespace', () => {
    for (const [namespace, catalog] of Object.entries(translations)) {
      expect(Object.keys(catalog.nl).sort(), namespace).toEqual(Object.keys(catalog.en).sort());
    }
  });
});

describe('folders namespace', () => {
  const { en, nl } = translations.folders;
  const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

  it('has the same keys in English and Dutch', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });

  it('keeps every {placeholder} in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('has no empty strings', () => {
    for (const table of [en, nl]) {
      for (const [key, value] of Object.entries(table)) expect(value.trim(), key).not.toBe('');
    }
  });

  it('defines every key listed as still missing in src/i18n/folders-keys.md', () => {
    const doc = readFileSync(join(__dirname, '..', '..', 'i18n', 'folders-keys.md'), 'utf8');
    const listed = [...doc.matchAll(/^\| `([a-zA-Z]+)` \|/gm)].map((m) => m[1]);
    expect(listed.length).toBeGreaterThan(0);
    for (const key of listed) {
      expect(Object.keys(en), key).toContain(key);
      expect(Object.keys(nl), key).toContain(key);
    }
  });
});
