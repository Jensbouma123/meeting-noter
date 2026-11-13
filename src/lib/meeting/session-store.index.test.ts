import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalSegment as seg, installMemoryStorage, snapshot } from './session-store.testUtils';

beforeEach(installMemoryStorage);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('per-session transcripts (B1)', () => {
  it("keeps each session's transcript under its own key, so an older session is recoverable", async () => {
    const { createDraftSession, persistSession, listSessions } = await import('./session-crud');
    const { getFullSession } = await import('./session-open');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 4), seg('a2', 4, 10)], speakers: {} });
    persistSession({ sessionId: b, segments: [seg('b1', 0, 2)], speakers: {} });
    expect(getFullSession(a)?.segments.map((s) => s.id)).toEqual(['a1', 'a2']);
    const meta = listSessions().find((s) => s.sessionId === a);
    expect(meta).toMatchObject({ title: 'A', segmentCount: 2, durationSeconds: 10, isDraft: false });
  });

  it('the throttled autosave also writes the per-session key', async () => {
    const { saveAutosavedSession } = await import('./autosave');
    const { loadSessionTranscript } = await import('./session-transcript-storage');
    saveAutosavedSession({ sessionId: 'a', title: 'A', segments: [seg('a1', 0, 1)], speakers: {} });
    saveAutosavedSession({ sessionId: 'b', title: 'B', segments: [seg('b1', 0, 1)], speakers: {} });
    expect(loadSessionTranscript('a')?.segments.map((s) => s.id)).toEqual(['a1']);
  });

  it('an empty store does not blank a saved transcript or zero its counts', async () => {
    const { createDraftSession, persistSession } = await import('./session-crud');
    const { getFullSession, getSessionMetadata } = await import('./session-open');
    const a = createDraftSession('A');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 3)], speakers: {} });
    persistSession({ sessionId: a, segments: [], speakers: {} });
    expect(getFullSession(a)?.segments).toHaveLength(1);
    expect(getSessionMetadata(a)?.segmentCount).toBe(1);
  });

  it("deleteSession removes only that session's transcript", async () => {
    const { createDraftSession, persistSession } = await import('./session-crud');
    const { deleteSession } = await import('./session-delete');
    const { loadSessionTranscript } = await import('./session-transcript-storage');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 1)], speakers: {} });
    persistSession({ sessionId: b, segments: [seg('b1', 0, 1)], speakers: {} });
    deleteSession(a);
    expect(loadSessionTranscript(a)).toBeNull();
    expect(loadSessionTranscript(b)?.segments).toHaveLength(1);
  });

  it("openSession falls back to this session's autosave and repairs the stale index counts", async () => {
    const { createDraftSession } = await import('./session-crud');
    const { openSession, getSessionMetadata } = await import('./session-open');
    const { AUTOSAVE_KEY } = await import('./autosave');
    const a = createDraftSession('A');
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      version: 1, savedAt: Date.now(), sessionId: a, title: 'A',
      segments: [seg('a1', 0, 5)], speakers: {}, startedAt: 1,
    }));
    expect(openSession(a)?.segments.map((s) => s.id)).toEqual(['a1']);
    expect(getSessionMetadata(a)).toMatchObject({ segmentCount: 1, durationSeconds: 5, isDraft: false });
  });
});

describe('Record in an existing session (B3)', () => {
  it('archiveAutosavedSession keeps the previous transcript retrievable after the slot is cleared', async () => {
    const { createDraftSession } = await import('./session-crud');
    const { archiveAutosavedSession, getFullSession } = await import('./session-open');
    const { AUTOSAVE_KEY, clearAutosavedSession } = await import('./autosave');
    const a = createDraftSession('A');
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      version: 1, savedAt: Date.now(), sessionId: a, title: 'A',
      segments: [seg('a1', 0, 1)], speakers: {}, startedAt: 1,
    }));
    expect(archiveAutosavedSession()).toBe(a);
    clearAutosavedSession();
    expect(getFullSession(a)?.segments.map((s) => s.id)).toEqual(['a1']);
  });
});

describe('resume on the home page (B4)', () => {
  it("persistSession indexes the autosave's own session when it has no entry yet", async () => {
    const { createDraftSession, persistSession, listSessions } = await import('./session-crud');
    createDraftSession('B newest');
    persistSession({ sessionId: 'autosave-a', title: 'A', segments: [seg('a1', 0, 1)], speakers: {}, startedAt: 5 });
    expect(listSessions().find((s) => s.sessionId === 'autosave-a')).toMatchObject({ title: 'A', segmentCount: 1 });
  });
});

describe('renameSession (B5)', () => {
  it('updates the title and updatedAt, and a later persist keeps the new title', async () => {
    const { createDraftSession, renameSession, persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const a = createDraftSession('Standup');
    now.mockReturnValue(2000);
    expect(renameSession(a, 'Retro')).toBe(true);
    expect(getSessionMetadata(a)).toMatchObject({ title: 'Retro', updatedAt: 2000, createdAt: 1000 });
    persistSession({ sessionId: a, segments: [seg('a1', 0, 1)], speakers: {} });
    expect(getSessionMetadata(a)?.title).toBe('Retro');
    expect(renameSession('missing', 'x')).toBe(false);
    now.mockRestore();
  });
});

describe('persistSession metadata (B7)', () => {
  it('stamps a new entry with startedAt, not now', async () => {
    const { persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    persistSession({ sessionId: 'x', title: 'X', segments: [seg('x1', 0, 1)], speakers: {}, startedAt: 12345 });
    expect(getSessionMetadata('x')?.createdAt).toBe(12345);
  });

  it('keeps a draft a draft when persisted with no segments', async () => {
    const { createDraftSession, persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const a = createDraftSession('A');
    persistSession({ sessionId: a, segments: [], speakers: {} });
    expect(getSessionMetadata(a)?.isDraft).toBe(true);
  });

  it('computes duration over 200k segments without a RangeError', async () => {
    const { persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const many = Array.from({ length: 200_000 }, (_, i) => seg(`s${i}`, i, i + 1));
    persistSession({ sessionId: 'big', title: 'Big', segments: many, speakers: {} });
    expect(getSessionMetadata('big')?.durationSeconds).toBe(200_000);
  });
});

describe('word timings', () => {
  it('are left out of a saved transcript', async () => {
    const { saveSessionTranscript, loadSessionTranscript } = await import('./session-transcript-storage');
    const words = [{ text: 'hello', start: 0, end: 0.4 }, { text: 'there', start: 0.5, end: 1 }];
    saveSessionTranscript({ ...snapshot('w1'), segments: [{ ...snapshot('w1').segments[0], words }] } as never);

    const loaded = loadSessionTranscript('w1')!;
    expect(loaded.segments[0].text).toBe('hello there');
    expect(loaded.segments[0]).not.toHaveProperty('words');
  });
});
