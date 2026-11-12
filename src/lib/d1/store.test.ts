// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SegmentTriage, SessionIntelligence } from '@/lib/meeting/types';
import {
  __resetIntelligenceStoreForTests,
  clearSessionIntelligence,
  getSessionIntelligence,
  hashSegmentText,
  subscribeIntelligence,
  triageKey,
  updateSessionIntelligence,
  useSessionIntelligence,
} from './store';

const DB_NAME = 'mn-intelligence-db';

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function triage(segmentId: string, text: string): SegmentTriage {
  const textHash = hashSegmentText(text);
  return {
    segmentId,
    textHash,
    reviewedSpans: [{ startChar: 0, endChar: 4, suggestion: 'Ship' }],
    suspectSpeaker: false,
    analyzedAt: 1,
  };
}

beforeEach(async () => {
  __resetIntelligenceStoreForTests();
  await deleteDb();
});

afterEach(() => {
  __resetIntelligenceStoreForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('hashSegmentText', () => {
  it('is deterministic and changes with the text', () => {
    expect(hashSegmentText('we ship friday')).toBe(hashSegmentText('we ship friday'));
    expect(hashSegmentText('we ship friday')).not.toBe(hashSegmentText('we ship monday'));
    expect(hashSegmentText('')).toMatch(/^[0-9a-z]+$/);
  });

  it('keys triage by segment id and text hash', () => {
    expect(triageKey('seg-1', 'abc')).toBe('seg-1:abc');
  });
});

describe('session intelligence store', () => {
  it('returns an empty record for an unknown session', async () => {
    const record = await getSessionIntelligence('nope');
    expect(record).toMatchObject({
      sessionId: 'nope',
      status: 'idle',
      progress: { done: 0, total: 0 },
      triageBySegment: {},
      decisions: [],
      actionItems: [],
    });
  });

  it('writes to IndexedDB and reads back after the in-memory state is dropped', async () => {
    const text = 'we ship friday';
    const t = triage('seg-1', text);
    await updateSessionIntelligence('s1', (cur) => ({
      ...cur,
      status: 'done',
      progress: { done: 1, total: 1 },
      triageBySegment: { [triageKey(t.segmentId, t.textHash)]: t },
      decisions: [{ id: 'd1', text: 'Ship friday', segmentIds: ['seg-1'], start: 3 }],
    }));

    __resetIntelligenceStoreForTests();
    const record = await getSessionIntelligence('s1');
    expect(record.status).toBe('done');
    expect(record.triageBySegment[`seg-1:${t.textHash}`]).toEqual(t);
    expect(record.decisions).toHaveLength(1);
    expect(record.updatedAt).toBeGreaterThan(0);
  });

  it('keeps both updates when writes for one session overlap', async () => {
    await Promise.all([
      updateSessionIntelligence('s1', (cur) => ({
        ...cur,
        decisions: [...cur.decisions, { id: 'd1', text: 'A', segmentIds: [], start: 0 }],
      })),
      updateSessionIntelligence('s1', (cur) => ({
        ...cur,
        actionItems: [...cur.actionItems, { id: 'a1', text: 'B', segmentIds: [], start: 1 }],
      })),
    ]);
    const record = await getSessionIntelligence('s1');
    expect(record.decisions.map((d) => d.id)).toEqual(['d1']);
    expect(record.actionItems.map((a) => a.id)).toEqual(['a1']);
  });

  it('keeps sessions apart', async () => {
    await updateSessionIntelligence('a', (cur) => ({ ...cur, status: 'running' }));
    await updateSessionIntelligence('b', (cur) => ({ ...cur, status: 'error', error: 'boom' }));
    expect((await getSessionIntelligence('a')).status).toBe('running');
    expect((await getSessionIntelligence('b')).error).toBe('boom');
  });

  it('removes a session on clear', async () => {
    await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'done' }));
    await clearSessionIntelligence('s1');
    expect((await getSessionIntelligence('s1')).status).toBe('idle');
  });

  it('never writes intelligence to localStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'done' }));
    expect(setItem).not.toHaveBeenCalled();
  });

  it('falls back to memory when indexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    __resetIntelligenceStoreForTests();
    await updateSessionIntelligence('mem', (cur) => ({ ...cur, status: 'done' }));
    expect((await getSessionIntelligence('mem')).status).toBe('done');
  });

  it('notifies subscribers on write and loads a stored record on subscribe', async () => {
    await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'running' }));
    __resetIntelligenceStoreForTests();

    const seen: string[] = [];
    const unsubscribe = subscribeIntelligence('s1', () => seen.push('change'));
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));

    await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'done' }));
    expect(seen.length).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });
});

describe('useSessionIntelligence', () => {
  it('re-renders with the stored record and again after a write', async () => {
    await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'running' }));
    __resetIntelligenceStoreForTests();

    const { result } = renderHook(() => useSessionIntelligence('s1'));
    expect(result.current.sessionId).toBe('s1');
    await waitFor(() => expect(result.current.status).toBe('running'));

    await act(async () => {
      await updateSessionIntelligence('s1', (cur) => ({ ...cur, status: 'done' }));
    });
    expect(result.current.status).toBe('done');
  });

  it('returns a stable object between renders with no change', () => {
    const { result, rerender } = renderHook(() => useSessionIntelligence('quiet'));
    const first: SessionIntelligence = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
