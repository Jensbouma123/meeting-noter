// @vitest-environment jsdom
import { expect, it, vi, describe } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { harness, line, loadSync, readDb, reload, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('server sync pulling', () => {
  it('pulls meetings the browser lacks, with transcript and notes', async () => {
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().save(sampleMeeting({ id: 'from-disk' }));
    const sync = await loadSync();
    await sync.startServerSync();
    const { listSessions } = await import('./session-crud');
    const { openSession } = await import('./session-open');
    const { getNotes } = await import('./notes');
    expect(listSessions().map((s) => s.sessionId)).toContain('from-disk');

    expect(localStorage.getItem('mn.session.from-disk.v1')).toBeNull();
    expect(await sync.ensureMeetingLoaded('from-disk')).toBe(true);
    expect(openSession('from-disk')?.segments.map((s) => s.text)).toEqual([
      'Let us look at the quarterly budget.',
      'We ship the café export on Friday.',
    ]);
    expect(getNotes('from-disk').decisions[0].text).toBe('Freeze the scope');

    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1') ?? '{"save":[]}').save).toEqual([]);
  });

  it('loads every saved meeting back from the DB after the browser data is cleared', async () => {
    let sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-open')), ...(await import('./session-delete')), ...(await import('./session-recording')) };
    const { addDecision } = await import('./notes');
    const id = store.persistSession({ title: 'Budget', segments: [line('a', 'cut the travel line', 0)], speakers: {} });
    addDecision(id, 'No travel in Q1');
    await sync.flushServerSync();

    await reload({ clear: true });
    sync = await loadSync();
    await sync.startServerSync();
    const after = { ...(await import('./session-crud')), ...(await import('./session-open')) };
    const { getNotes } = await import('./notes');
    expect(after.listSessions().map((s) => s.sessionId)).toEqual([id]);
    await sync.ensureMeetingLoaded(id);
    expect(after.openSession(id)?.segments.map((s) => s.text)).toEqual(['cut the travel line']);
    expect(getNotes(id).decisions.map((d) => d.text)).toEqual(['No travel in Q1']);
  });

  it('a cleared transcript stays gone: no refetch of the old copy, no append prompt, DB emptied', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-open')), ...(await import('./session-delete')), ...(await import('./session-recording')) };
    const id = store.persistSession({ title: 'Standup', segments: [line('a', 'delete me please', 0)], speakers: {} });
    await sync.flushServerSync();
    await sync.ensureMeetingLoaded(id);
    expect(store.sessionHasTranscript(id)).toBe(true);

    expect(store.clearSessionTranscript(id)).toBe(true);

    await sync.ensureMeetingLoaded(id);
    await sync.flushServerSync();

    expect(store.sessionHasTranscript(id)).toBe(false);
    expect(store.startRecordingInSession(id, 'append')).toBeNull();
    expect(store.openSession(id)).toBeNull();
    const db = readDb();
    expect(db.get(id)?.segments).toEqual([]);
    db.close();
  });

  it('replays edits made offline once the browser is back online, without duplicates', async () => {
    let sync = await loadSync();
    await sync.startServerSync();
    let store = await import('./session-crud');
    harness.online = false;
    const a = store.persistSession({ title: 'Standup', segments: [line('a', 'yesterday I', 0)], speakers: {} });
    const b = store.createDraftSession('Planning');
    store.renameSession(a, 'Standup Monday');
    await sync.flushServerSync();


    await reload();
    sync = await loadSync();
    await sync.startServerSync();
    store = await import('./session-crud');
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save.sort()).toEqual([a, b].sort());
    store.renameSession(b, 'Planning Q1');

    harness.online = true;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]));
    await sync.flushServerSync();
    const db = readDb();
    expect(db.list().map((m) => [m.id, m.title]).sort()).toEqual([[a, 'Standup Monday'], [b, 'Planning Q1']].sort());
    db.close();
  });

  it('sends a meeting the server lacks even when its queue entry was lost', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-open')), ...(await import('./session-delete')), ...(await import('./session-recording')) };
    harness.online = false;
    const id = store.persistSession({ title: 'Orphan', segments: [line('a', 'only here', 0)], speakers: {} });
    localStorage.removeItem('mn.sync.pending.v1');
    harness.online = true;
    await sync.pullFromServer();
    await sync.flushServerSync();
    const db = readDb();
    expect(db.get(id)?.title).toBe('Orphan');
    db.close();
  });

  it('pulls what the DB gained while the browser was offline when it comes back', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    harness.online = false;
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().save(sampleMeeting({ id: 'other-browser' }));
    harness.online = true;
    window.dispatchEvent(new Event('online'));
    const { listSessions } = await import('./session-crud');
    await vi.waitFor(() => expect(listSessions().map((s) => s.sessionId)).toContain('other-browser'));
  });
});
