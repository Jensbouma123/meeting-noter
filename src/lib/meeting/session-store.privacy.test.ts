import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allStoredText, installMemoryStorage, snapshot } from './session-store.testUtils';

beforeEach(installMemoryStorage);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('no transcript text stays in the browser after delete or clear', () => {
  const SECRET = 'hello there';
  async function seed() {
    const store = await import('./session-store');
    const { saveSpeakerState } = await import('./speaker-state-storage');
    const { scheduleAutosave } = await import('./autosave');
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
    expect(allStoredText()).toContain(SECRET);
    store.deleteSession(id);
    await new Promise((r) => setTimeout(r, 1100));
    expect(allStoredText().toLowerCase()).not.toContain(SECRET);
    expect(allStoredText()).not.toContain('Secret plans');
    expect(allStoredText()).not.toContain(id.slice(0, 8) + '.v1');
  });

  it('clearSessionTranscript drops transcript, speaker state and the search index (quotes of the text)', async () => {
    const { store, id } = await seed();
    store.clearSessionTranscript(id);
    await new Promise((r) => setTimeout(r, 1100));
    const text = allStoredText();
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
    expect(allStoredText().toLowerCase()).not.toContain(SECRET);
    expect(localStorage.getItem('mn.settings')).not.toBeNull();
  });

  it('createDraftSessionInFolder flushes server sync before moving the draft into the folder', async () => {
    const order: string[] = [];
    vi.doMock('./sync-flush', () => ({
      flushServerSync: vi.fn(async () => { order.push('flush'); }),
    }));
    vi.doMock('./sync-queue', () => ({
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
