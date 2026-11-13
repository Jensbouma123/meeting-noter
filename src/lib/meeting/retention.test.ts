// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RETENTION, expiredSessionIds, parseRetention, purgeExpiredSessions, retentionCutoff } from './retention';
import { requestPersistentStorage } from './persistent-storage';
import { createDraftSession, listSessions } from './session-crud';

const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();

describe('retention', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to 2 years, also for junk values', () => {
    expect(DEFAULT_RETENTION).toBe('2y');
    expect(parseRetention(undefined)).toBe('2y');
    expect(parseRetention('10y')).toBe('2y');
    expect(parseRetention('5y')).toBe('5y');
  });

  it('computes calendar-year cutoffs; never has none', () => {
    expect(retentionCutoff('1y', NOW)).toBe(new Date(2025, 10, 10, 12).getTime());
    expect(retentionCutoff('2y', NOW)).toBe(new Date(2024, 10, 10, 12).getTime());
    expect(retentionCutoff('5y', NOW)).toBe(new Date(2021, 10, 10, 12).getTime());
    expect(retentionCutoff('never', NOW)).toBeNull();
  });

  it('expires only meetings strictly older than the cutoff', () => {
    const cutoff = retentionCutoff('2y', NOW)!;
    const sessions = [
      { sessionId: 'old', createdAt: cutoff - 1 },
      { sessionId: 'edge', createdAt: cutoff },
      { sessionId: 'new', createdAt: NOW },
    ];
    expect(expiredSessionIds(sessions, '2y', NOW)).toEqual(['old']);
    expect(expiredSessionIds(sessions, 'never', NOW)).toEqual([]);
    expect(expiredSessionIds(sessions, '1y', NOW)).toEqual(['old', 'edge']);
  });

  it('purge deletes expired meetings from the index and keeps the rest', () => {
    const oldId = createDraftSession('Old');
    const freshId = createDraftSession('Fresh');
    const idx = JSON.parse(localStorage.getItem('mn.sessions.v1')!);
    idx.sessions.find((s: { sessionId: string }) => s.sessionId === oldId).createdAt =
      new Date(2020, 0, 1).getTime();
    localStorage.setItem('mn.sessions.v1', JSON.stringify(idx));

    expect(purgeExpiredSessions('never', NOW)).toBe(0);
    expect(listSessions()).toHaveLength(2);
    expect(purgeExpiredSessions('2y', Date.now())).toBe(1);
    expect(listSessions().map((s) => s.sessionId)).toEqual([freshId]);
  });

  it('requests persistence once and reports unsupported as false', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist, persisted: vi.fn().mockResolvedValue(false) } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe(false);
  });
});
