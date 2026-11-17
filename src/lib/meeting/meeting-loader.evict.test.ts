// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_KEY } from './autosave';
import { evictSynced, isOpen } from './meeting-loader';
import { SYNCED_KEY } from './sync-storage';

const SESSIONS_KEY_FOR_TESTS = 'mn.sessions.v1';

describe('evictSynced', () => {
  beforeEach(() => localStorage.clear());

  it('reads the autosave slot once regardless of session count', () => {
    const count = (n: number) => {
      localStorage.clear();
      const sessions = Array.from({ length: n }, (_, i) => ({
        version: 1,
        sessionId: `s${i}`,
        title: 't',
        segmentCount: 1,
        durationSeconds: 1,
        createdAt: 1,
        updatedAt: 1,
        isDraft: false,
      }));
      localStorage.setItem(SESSIONS_KEY_FOR_TESTS, JSON.stringify({ version: 1, sessions }));
      localStorage.setItem(SYNCED_KEY, JSON.stringify(Object.fromEntries(sessions.map((s) => [s.sessionId, 5]))));
      const get = vi.spyOn(Storage.prototype, 'getItem');
      evictSynced();
      const c = get.mock.calls.filter(([k]) => k === AUTOSAVE_KEY).length;
      vi.restoreAllMocks();
      return c;
    };
    expect(count(30)).toBe(count(2));
    expect(count(30)).toBe(1);
  });

  it('isOpen matches the autosaved session id', () => {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({
        version: 1,
        sessionId: 'a',
        title: '',
        segments: [{ id: 1, speakerId: 's', text: 'x', startMs: 0, endMs: 1, final: true }],
        speakers: [],
        startedAt: 1,
        savedAt: Date.now(),
      }),
    );
    expect(isOpen('a')).toBe(true);
    expect(isOpen('b')).toBe(false);
  });
});
