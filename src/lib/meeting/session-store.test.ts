import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k); },
    setItem: (k, v) => { data.set(k, String(v)); },
  };
}

const snapshot = (sessionId: string) => ({
  sessionId,
  title: 'Standup',
  segments: [{ id: 's1', speakerId: 'mic:0', text: 'hello there', start: 0, end: 1, final: true }],
  speakers: {},
  startedAt: 1,
});

beforeEach(() => {
  vi.resetModules();
  // session-store reads the global `localStorage`, persist reads `window.localStorage`.
  const storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleteSession and the resume prompt', () => {
  it('clears the in-memory transcript and autosave when the open session is deleted', async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { loadIdleSession, getState, getTranscriptSessionId } = await import('./store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const id = createDraftSession('Standup');
    loadIdleSession(id, snapshot(id) as never);
    saveAutosavedSession(snapshot(id) as never);
    expect(getState().segments).toHaveLength(1);
    deleteSession(id);
    expect(getState().segments).toHaveLength(0);
    expect(getTranscriptSessionId()).toBeNull();
    expect(loadAutosavedSession()).toBeNull();
  });

  it('leaves the open session untouched when a different one is deleted', async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { loadIdleSession, getState, getTranscriptSessionId } = await import('./store');
    const open = createDraftSession('Open');
    const other = createDraftSession('Other');
    loadIdleSession(open, snapshot(open) as never);
    deleteSession(other);
    expect(getTranscriptSessionId()).toBe(open);
    expect(getState().segments).toHaveLength(1);
  });

  it("drops the deleted session's autosave, so it is not offered for resume", async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const id = createDraftSession('Standup');
    saveAutosavedSession(snapshot(id) as never);
    expect(loadAutosavedSession()?.sessionId).toBe(id);
    deleteSession(id);
    expect(loadAutosavedSession()).toBeNull();
  });

  it('drops an older autosave saved under a per-tab id that matches no session', async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const id = createDraftSession('Standup');
    saveAutosavedSession(snapshot('tab-uuid-from-an-older-build') as never);
    deleteSession(id);
    expect(loadAutosavedSession()).toBeNull();
  });

  it("keeps another, still existing session's autosave", async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const keep = createDraftSession('Keep');
    const gone = createDraftSession('Gone');
    saveAutosavedSession(snapshot(keep) as never);
    deleteSession(gone);
    expect(loadAutosavedSession()?.sessionId).toBe(keep);
  });
});

const seg = (id: string, start: number, end: number) => ({
  id, source: 'mic' as const, speaker: 'mic:0', text: `text ${id}`, start, end, final: true,
});

describe('per-session transcripts (B1)', () => {
  it("keeps each session's transcript under its own key, so an older session is recoverable", async () => {
    const { createDraftSession, persistSession, getFullSession, listSessions } = await import('./session-store');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 4), seg('a2', 4, 10)], speakers: {} });
    persistSession({ sessionId: b, segments: [seg('b1', 0, 2)], speakers: {} });
    expect(getFullSession(a)?.segments.map((s) => s.id)).toEqual(['a1', 'a2']);
    const meta = listSessions().find((s) => s.sessionId === a);
    expect(meta).toMatchObject({ title: 'A', segmentCount: 2, durationSeconds: 10, isDraft: false });
  });

  it('the throttled autosave also writes the per-session key', async () => {
    const { saveAutosavedSession } = await import('./autosave'); const { loadSessionTranscript } = await import('./session-transcript-storage');
    saveAutosavedSession({ sessionId: 'a', title: 'A', segments: [seg('a1', 0, 1)], speakers: {} });
    saveAutosavedSession({ sessionId: 'b', title: 'B', segments: [seg('b1', 0, 1)], speakers: {} });
    expect(loadSessionTranscript('a')?.segments.map((s) => s.id)).toEqual(['a1']);
  });

  it('an empty store does not blank a saved transcript or zero its counts', async () => {
    const { createDraftSession, persistSession, getFullSession, getSessionMetadata } = await import('./session-store');
    const a = createDraftSession('A');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 3)], speakers: {} });
    persistSession({ sessionId: a, segments: [], speakers: {} });
    expect(getFullSession(a)?.segments).toHaveLength(1);
    expect(getSessionMetadata(a)?.segmentCount).toBe(1);
  });

  it("deleteSession removes only that session's transcript", async () => {
    const { createDraftSession, persistSession, deleteSession } = await import('./session-store');
    const { loadSessionTranscript } = await import('./session-transcript-storage');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    persistSession({ sessionId: a, segments: [seg('a1', 0, 1)], speakers: {} });
    persistSession({ sessionId: b, segments: [seg('b1', 0, 1)], speakers: {} });
    deleteSession(a);
    expect(loadSessionTranscript(a)).toBeNull();
    expect(loadSessionTranscript(b)?.segments).toHaveLength(1);
  });

  it('openSession falls back to this session\'s autosave and repairs the stale index counts', async () => {
    const { createDraftSession, openSession, getSessionMetadata } = await import('./session-store');
    const { AUTOSAVE_KEY } = await import('./autosave');
    const a = createDraftSession('A');
    // A crash before the per-session key existed: only the global slot holds A.
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      version: 1, savedAt: Date.now(), sessionId: a, title: 'A',
      segments: [seg('a1', 0, 5)], speakers: {}, startedAt: 1,
    }));
    expect(openSession(a)?.segments.map((s) => s.id)).toEqual(['a1']);
    expect(getSessionMetadata(a)).toMatchObject({ segmentCount: 1, durationSeconds: 5, isDraft: false });
  });
});

describe('navigating between sessions (B2)', () => {
  it('loadIdleSession replaces the store transcript and binds it to the new session', async () => {
    const store = await import('./store');
    store.restoreSnapshot([seg('a1', 0, 1)], {});
    store.bindTranscriptSession('A');
    expect(store.loadIdleSession('B', { segments: [seg('b1', 0, 1)], speakers: {}, startedAt: null })).toBe(true);
    expect(store.getState().segments.map((s) => s.id)).toEqual(['b1']);
    expect(store.getTranscriptSessionId()).toBe('B');
    store.loadIdleSession('C', null);
    expect(store.getState().segments).toEqual([]);
  });

  it("refuses while A is still recording, so A's segments stay bound to A", async () => {
    const store = await import('./store');
    store.restoreSnapshot([seg('a1', 0, 1)], {});
    store.bindTranscriptSession('A');
    store.setState({ status: 'stopping' });
    expect(store.loadIdleSession('B', null)).toBe(false);
    expect(store.getState().segments.map((s) => s.id)).toEqual(['a1']);
    expect(store.getTranscriptSessionId()).toBe('A');
  });
});

describe('Record in an existing session (B3)', () => {
  it('archiveAutosavedSession keeps the previous transcript retrievable after the slot is cleared', async () => {
    const { createDraftSession, archiveAutosavedSession, getFullSession } = await import('./session-store');
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
    const { createDraftSession, persistSession, listSessions } = await import('./session-store');
    createDraftSession('B newest');
    persistSession({ sessionId: 'autosave-a', title: 'A', segments: [seg('a1', 0, 1)], speakers: {}, startedAt: 5 });
    expect(listSessions().find((s) => s.sessionId === 'autosave-a')).toMatchObject({ title: 'A', segmentCount: 1 });
  });
});

describe('renameSession (B5)', () => {
  it('updates the title and updatedAt, and a later persist keeps the new title', async () => {
    const { createDraftSession, renameSession, persistSession, getSessionMetadata } = await import('./session-store');
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

describe('deleting the recording session (B6)', () => {
  it('refuses to delete the session being recorded', async () => {
    const store = await import('./store');
    const { createDraftSession, deleteSession, sessionExists } = await import('./session-store');
    const a = createDraftSession('A');
    store.bindTranscriptSession(a);
    store.setState({ status: 'live' });
    expect(deleteSession(a)).toBe(false);
    expect(sessionExists(a)).toBe(true);
  });

  it("deleting another session does not clear the active session's autosave as an orphan", async () => {
    const store = await import('./store');
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const other = createDraftSession('Other');
    // The live session has no index entry (e.g. its entry was removed by "clear all").
    store.bindTranscriptSession('live-session');
    saveAutosavedSession(snapshot('live-session') as never);
    deleteSession(other);
    expect(loadAutosavedSession()?.sessionId).toBe('live-session');
  });
});

describe('persistSession metadata (B7)', () => {
  it('stamps a new entry with startedAt, not now', async () => {
    const { persistSession, getSessionMetadata } = await import('./session-store');
    persistSession({ sessionId: 'x', title: 'X', segments: [seg('x1', 0, 1)], speakers: {}, startedAt: 12345 });
    expect(getSessionMetadata('x')?.createdAt).toBe(12345);
  });

  it('keeps a draft a draft when persisted with no segments', async () => {
    const { createDraftSession, persistSession, getSessionMetadata } = await import('./session-store');
    const a = createDraftSession('A');
    persistSession({ sessionId: a, segments: [], speakers: {} });
    expect(getSessionMetadata(a)?.isDraft).toBe(true);
  });

  it('computes duration over 200k segments without a RangeError', async () => {
    const { persistSession, getSessionMetadata } = await import('./session-store');
    const many = Array.from({ length: 200_000 }, (_, i) => seg(`s${i}`, i, i + 1));
    persistSession({ sessionId: 'big', title: 'Big', segments: many, speakers: {} });
    expect(getSessionMetadata('big')?.durationSeconds).toBe(200_000);
  });
});

describe('startRecordingInSession', () => {
  const seg = (id: string, start: number, end: number, text = 'hi') => ({
    id, source: 'mic', speaker: 'mic:0', text, start, end, final: true,
  });
  const setup = async () => {
    const ss = await import('./session-store');
    const store = await import('./store');
    const persist = await import('./autosave');
    const id = ss.createDraftSession('Standup');
    store.loadIdleSession(id, { segments: [seg('s1', 0, 5), seg('s2', 5, 10)] as never, speakers: {}, startedAt: 1 });
    ss.persistSession({ sessionId: id, segments: [seg('s1', 0, 5), seg('s2', 5, 10)] as never, speakers: {}, startedAt: 1 });
    return { ss, store, persist, id };
  };

  it('sessionHasTranscript reflects stored text', async () => {
    const { ss, id } = await setup();
    expect(ss.sessionHasTranscript(id)).toBe(true);
    expect(ss.sessionHasTranscript(ss.createDraftSession('Empty'))).toBe(false);
  });

  it('append keeps segments and continues timestamps after the previous end', async () => {
    const { ss, store, id } = await setup();
    expect(ss.startRecordingInSession(id, 'append')).toBe(id);
    store.resetSession('both'); // what meeting.start does
    expect(store.getState().segments.map((s) => s.id)).toEqual(['s1', 's2']);
    store.upsertSegment(seg('s1', 0, 2, 'new') as never); // capture reuses ids from 0
    const segs = store.getState().segments;
    expect(segs).toHaveLength(3);
    expect(segs[2]).toMatchObject({ text: 'new', start: 10, end: 12 });
    store.upsertSegment({ ...segs[2] }); // relabel re-upsert is not shifted twice
    expect(store.getState().segments[2]).toMatchObject({ start: 10, end: 12 });
    expect(store.getTranscriptSessionId()).toBe(id);
  });

  it('new archives the old transcript and binds a fresh empty session', async () => {
    const { ss, store, persist, id } = await setup();
    persist.saveAutosavedSession({ ...snapshot(id), segments: [seg('s1', 0, 5), seg('s2', 5, 10)] } as never);
    const fresh = ss.startRecordingInSession(id, 'new');
    expect(fresh).toBeTruthy();
    expect(fresh).not.toBe(id);
    expect(store.getTranscriptSessionId()).toBe(fresh);
    expect(ss.openSession(id)?.segments).toHaveLength(2);
    expect(persist.loadAutosavedSession()).toBeNull();
    store.resetSession('both');
    expect(store.getState().segments).toEqual([]);
    expect(ss.sessionHasTranscript(fresh as string)).toBe(false);
  });

  it('refuses while a capture is active', async () => {
    const { ss, store, id } = await setup();
    store.setState({ status: 'live' });
    expect(ss.startRecordingInSession(id, 'append')).toBeNull();
    expect(ss.startRecordingInSession(id, 'new')).toBeNull();
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

describe('clearSessionTranscript', () => {
  it('empties the store, autosave and saved transcript but keeps the session', async () => {
    const { createDraftSession, persistSession, clearSessionTranscript, getSessionMetadata, sessionExists } =
      await import('./session-store');
    const { loadIdleSession, getState, getTranscriptSessionId } = await import('./store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave'); const { loadSessionTranscript } = await import('./session-transcript-storage');
    const id = createDraftSession('Standup');
    persistSession({ sessionId: id, segments: snapshot(id).segments as never, speakers: {}, startedAt: 1 });
    loadIdleSession(id, snapshot(id) as never);
    saveAutosavedSession(snapshot(id) as never);

    expect(clearSessionTranscript(id)).toBe(true);

    expect(getState().segments).toHaveLength(0);
    expect(getState().startedAt).toBeNull();
    expect(getTranscriptSessionId()).toBe(id);
    expect(loadAutosavedSession()).toBeNull();
    expect(loadSessionTranscript(id)).toBeNull();
    expect(sessionExists(id)).toBe(true);
    expect(getSessionMetadata(id)).toMatchObject({ title: 'Standup', segmentCount: 0, durationSeconds: null });
  });

  it('leaves another session’s autosave alone and refuses unknown ids', async () => {
    const { createDraftSession, clearSessionTranscript } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    saveAutosavedSession(snapshot(b) as never);
    expect(clearSessionTranscript(a)).toBe(true);
    expect(loadAutosavedSession()?.sessionId).toBe(b);
    expect(clearSessionTranscript('nope')).toBe(false);
  });
});

/** Everything in localStorage as one string. */
function everything(): string {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i)!;
    out.push(k, localStorage.getItem(k) ?? '');
  }
  return out.join('\n');
}

describe('no transcript text stays in the browser after delete or clear', () => {
  const SECRET = 'hello there';
  async function seed() {
    const store = await import('./session-store');
    const { saveSpeakerState } = await import('./speaker-state-storage'); const { scheduleAutosave } = await import('./autosave');
    const { addDecision } = await import('./notes');
    const { saveIndex } = await import('@/lib/semantic-search/store');
    const id = store.persistSession({ title: 'Secret plans', segments: snapshot('x').segments as never, speakers: {}, startedAt: 1 });
    addDecision(id, 'Decision about hello there');
    saveSpeakerState(id, { mic: { speakers: [{ label: 'Hello there person' }] } } as never);
    saveIndex(id, { windows: [{ text: SECRET }] as never, vectors: [new Float32Array([0.1])], chapters: [{ title: SECRET }] as never });
    scheduleAutosave(snapshot(id) as never);
    return { store, id };
  }

  it('deleteSession wipes transcript, notes, speaker state, search index and the pending autosave', async () => {
    const { store, id } = await seed();
    expect(everything()).toContain(SECRET);
    store.deleteSession(id);
    await new Promise((r) => setTimeout(r, 1100)); // a throttled autosave must not resurrect it
    expect(everything().toLowerCase()).not.toContain(SECRET);
    expect(everything()).not.toContain('Secret plans');
    expect(everything()).not.toContain(id.slice(0, 8) + '.v1');
  });

  it('clearSessionTranscript drops transcript, speaker state and the search index (quotes of the text)', async () => {
    const { store, id } = await seed();
    store.clearSessionTranscript(id);
    await new Promise((r) => setTimeout(r, 1100));
    const text = everything();
    expect(text).not.toContain('mn.semindex.' + id);
    expect(text).not.toContain('mn.session.' + id);
    expect(text).not.toContain('Hello there person');
    expect(text).not.toContain('"text":"hello there"');
  });

  it('sweepMeetingStorage removes orphans no index entry points to', async () => {
    const { store } = await seed();
    localStorage.setItem('mn.session.orphan.v1', JSON.stringify({ text: SECRET }));
    localStorage.setItem('mn.notes.v1.orphan', SECRET);
    localStorage.setItem('mn.settings', '{"language":"nl"}');
    store.sweepMeetingStorage(null);
    expect(everything().toLowerCase()).not.toContain(SECRET);
    expect(localStorage.getItem('mn.settings')).not.toBeNull();
  });

  it('createDraftSessionInFolder flushes server sync before moving the draft into the folder', async () => {
    const order: string[] = [];
    vi.doMock('./server-sync', () => ({
      flushServerSync: vi.fn(async () => { order.push('flush'); }),
      queueMeetingDelete: vi.fn(),
      queueMeetingSync: vi.fn(),
    }));
    vi.doMock('@/lib/folders/folders-api', () => ({
      moveMeeting: vi.fn(async (id: string, folderId: string | null) => {
        order.push(`move:${id}:${folderId}`);
        return { ok: true, data: {} };
      }),
    }));
    const { createDraftSessionInFolder } = await import('./session-store');
    const id = await createDraftSessionInFolder('Folder draft', 'folder-1');
    expect(order).toEqual(['flush', `move:${id}:folder-1`]);

    order.length = 0;
    await createDraftSessionInFolder('Unfiled draft', null);
    expect(order).toEqual([]);
  });
});
