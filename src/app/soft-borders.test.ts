import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, 'soft-borders.css'), 'utf8');
const BACKGROUND = { light: '#e3eae4', dark: '#070a07' };

function token(selector: string, name: string): string {
  const start = CSS.indexOf(selector);
  const body = CSS.slice(CSS.indexOf('{', start), CSS.indexOf('}', start));
  const match = body.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match) throw new Error(`${name} missing in ${selector}`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const SCOPES = [
  ['light', ':root'],
  ['dark', 'html[data-theme="dark"]'],
  ['dark', 'html:not([data-theme="light"])'],
] as const;

describe('soft border tokens', () => {
  it.each(SCOPES)('%s input border stays >= 3:1 (%s)', (mode, selector) => {
    for (const name of ['--border', '--border-control']) {
      expect(contrast(token(selector, name), BACKGROUND[mode])).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(SCOPES)('%s soft border is far below input border (%s)', (mode, selector) => {
    const soft = contrast(token(selector, '--border-soft'), BACKGROUND[mode]);
    expect(soft).toBeLessThan(1.6);
    expect(soft).toBeGreaterThan(1);
  });
});
