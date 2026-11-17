import { beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from './session-store.testUtils';

const lines = Array.from({ length: 6 }, (_, i) => ({
  start: i * 30,
  end: i * 30 + 10,
  text: 'budget forecast revenue',
}));

async function modules() {
  const { createFakeEmbedder } = await import('@/lib/semantic-search/fake-embedder');
  const search = await import('@/lib/semantic-search/service');
  const { sweepMeetingStorage } = await import('./session-delete');
  const embedder = createFakeEmbedder();
  await search.indexMeeting('orphan', { embedder, loadLines: () => lines, captureActive: () => false });
  return { embedder, search, sweepMeetingStorage };
}

describe('sweepMeetingStorage and the semantic search caches', () => {
  beforeEach(installMemoryStorage);

  it('removes orphaned centroid records', async () => {
    const { sweepMeetingStorage } = await modules();
    expect(localStorage.getItem('mn.semcentroid.orphan.v1')).not.toBeNull();
    sweepMeetingStorage(null);
    expect(localStorage.getItem('mn.semindex.orphan.v1')).toBeNull();
    expect(localStorage.getItem('mn.semcentroid.orphan.v1')).toBeNull();
  });

  it('stops returning swept meetings from a warm search cache', async () => {
    const { embedder, search, sweepMeetingStorage } = await modules();
    expect((await search.searchMeetings('budget', 3, { embedder })).length).toBeGreaterThan(0);
    sweepMeetingStorage(null);
    expect(await search.searchMeetings('budget', 3, { embedder })).toEqual([]);
  });
});
