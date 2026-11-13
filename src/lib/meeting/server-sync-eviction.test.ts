// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { harness, line, loadSync, readDb, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('localStorage holds only unsent edits and the open meeting', () => {
  const transcriptKey = (id: string) => `mn.session.${id}.v1`;
  const notesKey = (id: string) => `mn.notes.v1.${id}`;

  it('drops the transcript and notes of a meeting once the server has them, but not of the open one', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = await import('./session-store');
    const { addDecision } = await import('./notes');
    const { loadIdleSession } = await import('./store');
    const closed = store.persistSession({ title: 'Closed', segments: [line('a', 'old news', 0)], speakers: {} });
    addDecision(closed, 'Ship it');
    const open = store.persistSession({ title: 'Open', segments: [line('b', 'on screen', 0)], speakers: {} });
    addDecision(open, 'Keep it');
    const shown = store.openSession(open)!;
    loadIdleSession(open, { segments: shown.segments, speakers: shown.speakers, startedAt: shown.startedAt ?? null });
    harness.online = false;
    await sync.flushServerSync();

    expect(localStorage.getItem(transcriptKey(closed))).not.toBeNull();

    harness.online = true;
    await sync.flushServerSync();
    expect(localStorage.getItem(transcriptKey(closed))).toBeNull();
    expect(localStorage.getItem(notesKey(closed))).toBeNull();
    expect(localStorage.getItem(transcriptKey(open))).not.toBeNull();
    expect(localStorage.getItem(notesKey(open))).not.toBeNull();
    expect(store.listSessions().map((s) => s.title).sort()).toEqual(['Closed', 'Open']);

    expect(await sync.ensureMeetingLoaded(closed)).toBe(true);
    expect(store.openSession(closed)?.segments.map((s) => s.text)).toEqual(['old news']);
  });

  it('never sends a dropped meeting back without its transcript', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = await import('./session-store');
    const { addAction, getNotes } = await import('./notes');
    const id = store.persistSession({ title: 'Kept whole', segments: [line('a', 'every word', 0)], speakers: {} });
    addAction(id, 'Write it up');
    await sync.flushServerSync();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();


    harness.online = false;
    store.renameSession(id, 'Kept whole v2');
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([id]);

    harness.online = true;
    await sync.flushServerSync();
    const db = readDb();
    const stored = db.get(id)!;
    db.close();
    expect(stored.title).toBe('Kept whole v2');
    expect(stored.segments.map((s) => s.text)).toEqual(['every word']);
    expect(stored.notes.actions.map((a) => a.text)).toEqual(['Write it up']);
    expect(getNotes(id).actions).toEqual([]);
  });

  it('finds a dropped transcript through the DB search', async () => {
    const sync = await loadSync();
    expect(await sync.searchMeetingIds('quarterly')).toBeNull();
    await sync.startServerSync();
    const store = await import('./session-store');
    const id = store.persistSession({ title: 'Finance', segments: [line('a', 'quarterly budget review', 0)], speakers: {} });
    await sync.flushServerSync();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();
    expect(await sync.searchMeetingIds('budget')).toEqual(new Set([id]));
  });
});
