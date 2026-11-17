// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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

async function pullCounting(n: number) {
  vi.resetModules();
  localStorage.clear();
  const list = rows(n);
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ meetings: list, deleted: [] })));
  const { pullFromServer } = await import('./sync-pull');
  const get = vi.spyOn(Storage.prototype, 'getItem');
  const set = vi.spyOn(Storage.prototype, 'setItem');
  const adopted = await pullFromServer();
  const synced = (calls: unknown[][]) => calls.filter((c) => c[0] === 'mn.sync.synced.v1').length;
  const result = { adopted, reads: synced(get.mock.calls), writes: synced(set.mock.calls) };
  get.mockRestore();
  set.mockRestore();
  return result;
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

it('touches the synced map a constant number of times regardless of rows pulled', async () => {
  const few = await pullCounting(3);
  const many = await pullCounting(40);
  expect(few.adopted).toBe(3);
  expect(many.adopted).toBe(40);
  expect(many.writes).toBe(1);
  expect(many.reads).toBe(few.reads);
  expect(JSON.parse(localStorage.getItem('mn.sync.synced.v1') ?? '{}')['m39']).toBe(2039);
});
