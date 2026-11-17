// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { MeetingSummaryRow } from '@/lib/meeting-db/types';

function rows(n: number): MeetingSummaryRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    title: `Meeting ${i}`,
    createdAt: 1000 + i,
    updatedAt: 2000 + i,
    startedAt: null,
    durationSeconds: null,
    segmentCount: 0,
    captureMode: null,
    isDraft: true,
    speakers: [],
    folderId: null,
    folderSuggestionDeclined: [],
  }));
}

afterEach(() => vi.unstubAllGlobals());

it('writes the session index once and fires one sessions-changed event per pull', async () => {
  vi.resetModules();
  localStorage.clear();
  const list = rows(5);
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ meetings: list, deleted: [] })));
  const { pullFromServer } = await import('./sync-pull');
  const set = vi.spyOn(Storage.prototype, 'setItem');
  const events = vi.fn();
  window.addEventListener('mn:sessions-changed', events);
  expect(await pullFromServer()).toBe(5);
  expect(set.mock.calls.filter((c) => c[0] === 'mn.sessions.v1')).toHaveLength(1);
  expect(events).toHaveBeenCalledTimes(1);
  const index = JSON.parse(localStorage.getItem('mn.sessions.v1') ?? '{}') as { sessions: { sessionId: string }[] };
  expect(index.sessions.map((s) => s.sessionId)).toEqual(list.map((r) => r.id));
  set.mockRestore();
});
