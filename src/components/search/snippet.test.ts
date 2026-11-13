import { describe, expect, it } from 'vitest';
import { makeSnippet } from './snippet';

describe('makeSnippet', () => {
  it('returns short text unchanged', () => {
    expect(makeSnippet('  hello   world ', 'x')).toBe('hello world');
  });

  it('centres a long text on the first matching term', () => {
    const text = `${'alpha '.repeat(60)}budget review ${'omega '.repeat(60)}`;
    const snip = makeSnippet(text, 'budget', 80);
    expect(snip).toContain('budget');
    expect(snip.startsWith('…')).toBe(true);
    expect(snip.length).toBeLessThanOrEqual(82);
  });

  it('falls back to the start when no term matches', () => {
    const snip = makeSnippet('a'.repeat(300), 'zzz', 50);
    expect(snip).toBe(`${'a'.repeat(50)}…`);
  });
});
