import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_PORT, LEGACY_PORT } from '../../src/lib/lifecycle/constants';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => readFileSync(path.join(repo, file), 'utf8');
const lines3000 = (text: string) => text.split('\n').filter((l) => /\b3000\b/.test(l) && !l.trimStart().startsWith('#'));

describe('installed app port', () => {
  it('is not the next dev port', () => {
    expect(APP_PORT).not.toBe(3000);
    expect(LEGACY_PORT).toBe(3000);
  });

  it.each(['scripts/installer/install.sh', 'scripts/installer/launcher.sh'])('%s defaults to APP_PORT', (file) => {
    expect(read(file)).toContain(`PORT=\${MEETING_NOTER_PORT:-${APP_PORT}}`);
  });

  it('install.sh names 3000 only as the legacy port it migrates from', () => {
    const text = read('scripts/installer/install.sh');
    expect(text).toContain(`LEGACY_PORT=\${MEETING_NOTER_LEGACY_PORT:-${LEGACY_PORT}}`);
    expect(lines3000(text).filter((l) => !l.startsWith('LEGACY_PORT='))).toEqual([]);
  });

  it('the launcher never uses 3000 in code', () => {
    expect(lines3000(read('scripts/installer/launcher.sh'))).toEqual([]);
  });

  it.each(['docs/INSTALL-MAC.md', 'scripts/installer/uninstall.sh'])('%s points at the new address', (file) => {
    expect(read(file)).toContain(`localhost:${APP_PORT}`);
  });
});
