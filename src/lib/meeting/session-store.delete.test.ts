import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMemoryStorage, loadMeetingStoreModules, snapshot } from './session-store.testUtils';

beforeEach(installMemoryStorage);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleteSession and the resume prompt', () => {
  it('clears the in-memory transcript and autosave when the open session is deleted', async () => {
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { loadIdleSession, getState, getTranscriptSessionId } = await loadMeetingStoreModules();
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
    const { loadIdleSession, getState, getTranscriptSessionId } = await loadMeetingStoreModules();
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

describe('deleting the recording session (B6)', () => {
  it('refuses to delete the session being recorded', async () => {
    const store = await loadMeetingStoreModules();
    const { createDraftSession, deleteSession, sessionExists } = await import('./session-store');
    const a = createDraftSession('A');
    store.bindTranscriptSession(a);
    store.setState({ status: 'live' });
    expect(deleteSession(a)).toBe(false);
    expect(sessionExists(a)).toBe(true);
  });

  it("deleting another session does not clear the active session's autosave as an orphan", async () => {
    const store = await loadMeetingStoreModules();
    const { createDraftSession, deleteSession } = await import('./session-store');
    const { saveAutosavedSession, loadAutosavedSession } = await import('./autosave');
    const other = createDraftSession('Other');
    store.bindTranscriptSession('live-session');
    saveAutosavedSession(snapshot('live-session') as never);
    deleteSession(other);
    expect(loadAutosavedSession()?.sessionId).toBe('live-session');
  });
});
