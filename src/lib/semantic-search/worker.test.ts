import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('semantic-search worker', () => {
  // Next/Turbopack fold `typeof window` to "object" in every client bundle, which
  // dead-strips a `typeof window === 'undefined'` block. The worker script is a
  // client bundle, so such a guard turns the whole entry into an empty script
  // (no message handler, no error) in every browser.
  it('has no bundler-folded window guard around its body', () => {
    const src = readFileSync(join(__dirname, 'worker.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/typeof\s+window/);
    expect(src).toMatch(/self\.onmessage\s*=/);
  });
});
