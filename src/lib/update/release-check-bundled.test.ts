import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../release-notes.json', () => ({ default: { '0.3.0': '- Bundled note' } }));

import { buildCheck } from './release-check';

describe('buildCheck bundled notes', () => {
  it('falls back to the release-notes.json entry when the release has no body', () => {
    const info = { kind: 'git', current: '0.2.3', root: null, arch: 'arm64', appDir: '', stateDir: '' } as const;
    const rel = { version: '0.3.0', tag: 'v0.3.0', zipballUrl: null, pageUrl: 'p', name: 'v0.3.0', notes: null, publishedAt: null, assetNames: [] };
    expect(buildCheck(info, rel, false).notes).toBe('- Bundled note');
  });
});
