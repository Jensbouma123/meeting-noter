import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translations, type Namespace } from './index';

const SRC = join(__dirname, '..', '..');
const NAMESPACES = Object.keys(translations) as Namespace[];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

interface Used { file: string; key: string; prefix: boolean; namespaces: Namespace[] }

/** Every `t('key')` / ``t(`prefix.${x}`)`` call in a file that binds `useT('ns')`. */
function usedKeys(): Used[] {
  const used: Used[] = [];
  for (const file of sourceFiles(SRC)) {
    if (file.includes(`${join('src', 'lib', 'i18n')}`)) continue;
    const text = readFileSync(file, 'utf8');
    const bound = [...text.matchAll(/useT\(\s*'([a-z]+)'\s*\)/g)].map((m) => m[1] as Namespace);
    if (bound.length === 0) continue;
    for (const m of text.matchAll(/(?<![A-Za-z0-9_.$])t\(\s*(?:'([^'\n]+)'|"([^"\n]+)"|`([^`\n]*)`)/g)) {
      const literal = m[1] ?? m[2];
      if (literal !== undefined) {
        used.push({ file: relative(SRC, file), key: literal, prefix: false, namespaces: bound });
      } else if (m[3] !== undefined) {
        const [head] = m[3].split('${');
        used.push({ file: relative(SRC, file), key: head, prefix: m[3].includes('${'), namespaces: bound });
      }
    }
  }
  return used;
}

describe('i18n key usage', () => {
  const used = usedKeys();

  it('finds t() calls to check', () => {
    expect(used.length).toBeGreaterThan(100);
  });

  for (const language of ['en', 'nl'] as const) {
    it(`every t() key used in src/ exists in the ${language} dictionary`, () => {
      const missing = used
        .filter((u) => {
          const hasKey = (ns: Namespace) => {
            const keys = Object.keys(translations[ns][language]);
            return u.prefix ? keys.some((k) => k.startsWith(u.key)) : keys.includes(u.key);
          };
          return !u.namespaces.some(hasKey);
        })
        .map((u) => `${u.file}: ${u.key}${u.prefix ? '…' : ''} (${u.namespaces.join('|')})`);
      expect(missing).toEqual([]);
    });
  }

  it('keeps dictionaries flat so dotted keys resolve to strings', () => {
    for (const ns of NAMESPACES) {
      for (const language of ['en', 'nl'] as const) {
        const table = translations[ns][language] as Record<string, unknown>;
        for (const [key, value] of Object.entries(table)) {
          expect(typeof value, `${ns}.${language}.${key}`).toBe('string');
        }
      }
    }
  });
});
