// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';

const h = vi.hoisted(() => ({ read: vi.fn(), search: vi.fn() }));
vi.mock('./readTranscriptText', () => ({ readTranscriptText: h.read }));
vi.mock('@/lib/meeting/sync-control', () => ({ searchMeetingIds: h.search }));
vi.mock('@/lib/i18n/useT', () => ({ useT: () => (k: string) => k }));

import { useSessionSearch } from './useSessionSearch';

const NOW = Date.now();
const mk = (id: string, title: string): SessionMetadata =>
  ({ sessionId: id, title, createdAt: NOW, updatedAt: 1 }) as SessionMetadata;
const sessions = [mk('a', 'Alpha'), mk('b', 'Beta'), mk('c', 'Gamma')];
const texts: Record<string, string> = { a: 'Budget talk', b: 'nothing', c: 'BUDGET again' };
const ids = (r: { current: ReturnType<typeof useSessionSearch> }) =>
  r.current.groups.flatMap((g) => g.sessions.map((s) => s.sessionId)).sort();

async function type(r: { current: ReturnType<typeof useSessionSearch> }, q: string) {
  await act(async () => r.current.setQuery(q));
  await act(async () => {
    await new Promise((res) => setTimeout(res, 260));
  });
}

describe('useSessionSearch', () => {
  beforeEach(() => {
    h.read.mockReset().mockImplementation((id: string) => texts[id]);
    h.search.mockReset();
  });

  it('never reads transcripts when the server answered', async () => {
    h.search.mockResolvedValue(new Set(['a', 'c']));
    const { result } = renderHook(() => useSessionSearch(sessions, {}));
    await type(result, 'budget');
    expect(ids(result)).toEqual(['a', 'c']);
    expect(h.read).not.toHaveBeenCalled();
    await type(result, 'budge');
    expect(h.read).not.toHaveBeenCalled();
  });

  it('offline reads each transcript once across repeated queries', async () => {
    h.search.mockResolvedValue(null);
    const { result } = renderHook(() => useSessionSearch(sessions, {}));
    await type(result, 'budget');
    expect(ids(result)).toEqual(['a', 'c']);
    await type(result, 'budge');
    await type(result, 'nothing');
    expect(ids(result)).toEqual(['b']);
    expect(h.read).toHaveBeenCalledTimes(3);
  });
});
