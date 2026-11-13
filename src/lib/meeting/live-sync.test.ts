import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_SYNC_INTERVAL_MS, queueLiveSync, resetLiveSync } from './live-sync';
import { queueMeetingSync } from './sync-queue';

vi.mock('./sync-queue', () => ({ queueMeetingSync: vi.fn() }));

beforeEach(() => {
  resetLiveSync();
  vi.mocked(queueMeetingSync).mockClear();
});

describe('queueLiveSync', () => {
  it('queues a save during recording at most once per interval', () => {
    queueLiveSync('s1', 100_000);
    queueLiveSync('s1', 100_000 + LIVE_SYNC_INTERVAL_MS - 1);
    expect(queueMeetingSync).toHaveBeenCalledTimes(1);
    queueLiveSync('s1', 100_000 + LIVE_SYNC_INTERVAL_MS);
    queueLiveSync('s2', 100_001);
    expect(queueMeetingSync).toHaveBeenCalledTimes(3);
  });
});
