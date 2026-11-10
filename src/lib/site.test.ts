import { describe, expect, it, vi } from 'vitest';

describe('site', () => {
  it('uses path segments locally', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_HOSTED', '');
    const s = await import('./site');
    expect(s.sessionPath('abc')).toBe('/sessions/abc');
    expect(s.resolveSessionId('abc', 'zzz')).toBe('abc');
  });
  it('uses ?id= when hosted', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_HOSTED', '1');
    const s = await import('./site');
    expect(s.sessionPath('a b')).toBe('/sessions/_?id=a%20b');
    expect(s.resolveSessionId('_', 'a b')).toBe('a b');
    expect(s.resolveSessionId('_', null)).toBeUndefined();
  });
});
