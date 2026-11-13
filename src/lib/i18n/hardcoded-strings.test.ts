import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..');
const COMPONENTS = join(SRC, 'components');

const OTHER_SLICE = [
  join('components', 'onboarding'),
  join('components', 'update'),
  join('components', 'settings', 'VocabularySection.tsx'),
  join('components', 'settings', 'VocabularyRow.tsx'),
  join('components', 'settings', 'VocabularyAddField.tsx'),
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [full];
  });
}

const ATTRIBUTES = ['aria-label', 'aria-description', 'aria-placeholder', 'placeholder', 'alt', 'title', 'tooltip'];

function offenders(): string[] {
  const found: string[] = [];
  for (const file of sources(COMPONENTS)) {
    const rel = relative(SRC, file);
    if (OTHER_SLICE.some((skip) => rel.startsWith(skip))) continue;
    const text = readFileSync(file, 'utf8');
    for (const attribute of ATTRIBUTES) {
      const literal = new RegExp(`(?<![A-Za-z-])${attribute}="([^"{}]*[A-Za-z][^"{}]*)"`, 'g');
      for (const match of text.matchAll(literal)) {
        const line = text.slice(0, match.index).split('\n').length;
        found.push(`${rel}:${line} ${attribute}="${match[1]}"`);
      }
    }
  }
  return found;
}

describe('user-facing strings', () => {
  it('never hardcodes an aria-label, placeholder, tooltip, title or alt in a component', () => {
    expect(offenders()).toEqual([]);
  });
});
