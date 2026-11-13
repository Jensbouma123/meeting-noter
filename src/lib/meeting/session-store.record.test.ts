import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalSegment, installMemoryStorage, loadMeetingStoreModules, snapshot } from './session-store.testUtils';

beforeEach(installMemoryStorage);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('navigating between sessions (B2)', () => {
  it('loadIdleSession replaces the store transcript and binds it to the new session', async () => {
    const store = await loadMeetingStoreModules();
    store.restoreSnapshot([finalSegment('a1', 0, 1)], {});
    store.bindTranscriptSession('A');
    expect(store.loadIdleSession('B', { segments: [finalSegment('b1', 0, 1)], speakers: {}, startedAt: null })).toBe(true);
    expect(store.getState().segments.map((s) => s.id)).toEqual(['b1']);
    expect(store.getTranscriptSessionId()).toBe('B');
    store.loadIdleSession('C', null);
    expect(store.getState().segments).toEqual([]);
  });

  it("refuses while A is still recording, so A's segments stay bound to A", async () => {
    const store = await loadMeetingStoreModules();
    store.restoreSnapshot([finalSegment('a1', 0, 1)], {});
    store.bindTranscriptSession('A');
    store.setState({ status: 'stopping' });
    expect(store.loadIdleSession('B', null)).toBe(false);
    expect(store.getState().segments.map((s) => s.id)).toEqual(['a1']);
    expect(store.getTranscriptSessionId()).toBe('A');
  });
});

describe('startRecordingInSession', () => {
  const seg = (id: string, start: number, end: number, text = 'hi') => finalSegment(id, start, end, text);
  const setup = async () => {
    const ss = { ...(await import('./session-crud')), ...(await import('./session-open')), ...(await import('./session-recording')) };
    const store = await loadMeetingStoreModules();
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
    store.resetSession('both');
    expect(store.getState().segments.map((s) => s.id)).toEqual(['s1', 's2']);
    store.upsertSegment(seg('s1', 0, 2, 'new') as never);
    const segs = store.getState().segments;
    expect(segs).toHaveLength(3);
    expect(segs[2]).toMatchObject({ text: 'new', start: 10, end: 12 });
    store.upsertSegment({ ...segs[2] });
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

describe('clearSessionTranscript', () => {
  it('empties the store, autosave and saved transcript but keeps the session', async () => {
    const { createDraftSession, persistSession } = await import('./session-crud');
    const { clearSessionTranscript } = await import('./session-delete');
    const { getSessionMetadata, sessionExists } = await import('./session-open');
    const { loadIdleSession, getState, getTranscriptSessionId } = await loadMeetingStoreModules();
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const { loadSessionTranscript } = await import('./session-transcript-storage');
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
    const { createDraftSession } = await import('./session-crud');
    const { clearSessionTranscript } = await import('./session-delete');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const a = createDraftSession('A');
    const b = createDraftSession('B');
    saveAutosavedSession(snapshot(b) as never);
    expect(clearSessionTranscript(a)).toBe(true);
    expect(loadAutosavedSession()?.sessionId).toBe(b);
    expect(clearSessionTranscript('nope')).toBe(false);
  });
});
