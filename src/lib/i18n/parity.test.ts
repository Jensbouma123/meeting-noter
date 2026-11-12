import { describe, expect, it } from 'vitest';
import { translations, type Namespace } from './index';

const NAMESPACES = Object.keys(translations) as Namespace[];

/** `{name}`-style slots, sorted so order changes do not matter. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();
}

function entries(namespace: Namespace, language: 'en' | 'nl'): Array<[string, string]> {
  return Object.entries(translations[namespace][language] as Record<string, string>);
}

describe('catalog parity', () => {
  it('fills every slot in both languages', () => {
    const mismatched: string[] = [];
    for (const namespace of NAMESPACES) {
      const en = new Map(entries(namespace, 'en'));
      for (const [key, nlValue] of entries(namespace, 'nl')) {
        const enValue = en.get(key) ?? '';
        const enSlots = placeholders(enValue).join(',');
        const nlSlots = placeholders(nlValue).join(',');
        // A slot only one side has renders as a literal `{name}` for that
        // language, or silently drops the value the caller passed in.
        if (enSlots !== nlSlots) mismatched.push(`${namespace}.${key}: en{${enSlots}} nl{${nlSlots}}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('has no empty string', () => {
    const empty: string[] = [];
    for (const namespace of NAMESPACES) {
      for (const language of ['en', 'nl'] as const) {
        for (const [key, value] of entries(namespace, language)) {
          if (value.trim() === '') empty.push(`${namespace}.${language}.${key}`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it('leaves no Dutch string in English', () => {
    // Multi-word values that are identical in both catalogs are almost always
    // an untranslated entry; single words can legitimately coincide ("Mic").
    const allowed = new Set([
      'common.brand', // the product name
      'settings.uiEnglish', // endonyms: a language is always shown in its own language
      'settings.uiDutch',
      'settings.english',
      'settings.dutch',
      'settings.german',
      'settings.french',
      'settings.spanish',
      'settings.italian',
      'settings.portuguese',
      'settings.japanese',
      // Same words in both languages, not a translation gap.
      'sidebar.openCount', // "{n} open" is Dutch too
      'onboarding.models.download', // "Download 120 MB" is Dutch too
    ]);
    const untranslated: string[] = [];
    for (const namespace of NAMESPACES) {
      const en = new Map(entries(namespace, 'en'));
      for (const [key, nlValue] of entries(namespace, 'nl')) {
        const id = `${namespace}.${key}`;
        if (allowed.has(id)) continue;
        if (en.get(key) === nlValue && /\s/.test(nlValue)) untranslated.push(`${id}: ${nlValue}`);
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('never renders a raw key because a catalog is missing a value', () => {
    const raw: string[] = [];
    for (const namespace of NAMESPACES) {
      for (const language of ['en', 'nl'] as const) {
        for (const [key, value] of entries(namespace, language)) {
          if (value === key) raw.push(`${namespace}.${language}.${key}`);
        }
      }
    }
    expect(raw).toEqual([]);
  });
});
