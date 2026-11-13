import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('semantic-search worker', () => {
  it('has no bundler-folded window guard around its body', () => {
    const src = readFileSync(join(__dirname, 'worker.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/typeof\s+window/);
    expect(src).toMatch(/self\.onmessage\s*=/);
  });
});
