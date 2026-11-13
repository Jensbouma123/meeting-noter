import { describe, expect, it, vi } from 'vitest';
import { fetchReleaseNotes } from './fetch-notes';

describe('fetchReleaseNotes', () => {
  it('returns the GitHub release body and page url', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ body: '- a', html_url: 'https://x.test/r' }) });
    expect(await fetchReleaseNotes('9.9.9', fetchFn as unknown as typeof fetch)).toEqual({ notes: '- a', pageUrl: 'https://x.test/r' });
    expect(fetchFn.mock.calls[0][0]).toMatch(/tags\/v9\.9\.9$/);
  });

  it('skips silently offline when nothing is bundled', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await fetchReleaseNotes('9.9.9', fetchFn as unknown as typeof fetch)).toEqual({ notes: null, pageUrl: null });
  });
});
