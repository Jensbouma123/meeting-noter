import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeEmbedder } from '@/lib/semantic-search/fake-embedder';
import { indexMeeting, resetSearchCache, searchMeetings } from '@/lib/semantic-search/service';
import { sweepMeetingStorage } from './session-delete';

const lines = Array.from({ length: 6 }, (_, i) => ({ start: i * 30, end: i * 30 + 10, text: 'budget forecast revenue' }));

describe('sweepMeetingStorage and the semantic search caches', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSearchCache();
  });

  it('removes orphaned centroid records', async () => {
    const embedder = createFakeEmbedder();
    await indexMeeting('orphan', { embedder, loadLines: () => lines, captureActive: () => false });
    expect(localStorage.getItem('mn.semcentroid.orphan.v1')).not.toBeNull();
    sweepMeetingStorage(null);
    expect(localStorage.getItem('mn.semindex.orphan.v1')).toBeNull();
    expect(localStorage.getItem('mn.semcentroid.orphan.v1')).toBeNull();
  });

  it('stops returning swept meetings from a warm search cache', async () => {
    const embedder = createFakeEmbedder();
    await indexMeeting('orphan', { embedder, loadLines: () => lines, captureActive: () => false });
    expect((await searchMeetings('budget', 3, { embedder })).length).toBe(1);
    sweepMeetingStorage(null);
    expect(await searchMeetings('budget', 3, { embedder })).toEqual([]);
  });
});
