// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importLegacyOrigin } from './import-legacy-origin';
import type { LegacyEntry } from './types';

const fetchWith = (state: string) =>
  vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
    Response.json(init?.method === 'POST' ? { ok: true } : { state }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe('importLegacyOrigin', () => {
  beforeEach(() => localStorage.clear());

  it.each(['none', 'busy', 'expired', 'done'])(
    'does not touch the old origin when the server says %s',
    async (state) => {
      const request = vi.fn();
      expect(await importLegacyOrigin(window, fetchWith(state), request)).toBeNull();
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('imports, then tells the server it is done', async () => {
    const f = fetchWith('listening');
    const entries: LegacyEntry[] = [['mn.onboarding.done', '1']];
    expect(await importLegacyOrigin(window, f, async () => entries)).toBe(1);
    expect(localStorage.getItem('mn.onboarding.done')).toBe('1');
    expect(f).toHaveBeenLastCalledWith('/api/app/legacy-origin', expect.objectContaining({ method: 'POST' }));
  });

  it('keeps the migration pending when the export fails', async () => {
    const f = fetchWith('listening');
    expect(await importLegacyOrigin(window, f, async () => null)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });
});
