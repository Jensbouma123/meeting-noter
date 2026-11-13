// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { harness, line, loadSync, readDb, reload, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('deleted meetings and the one-time migration notice', () => {
  it('drops a meeting another browser deleted and never sends it back', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-server-adopt')), ...(await import('./session-delete')) };
    const id = store.persistSession({ title: 'Gone', segments: [line('a', 'bye', 0)], speakers: {} });
    await sync.flushServerSync();

    const { meetingStore } = await import('@/lib/meeting-db/meeting-store');
    meetingStore().delete(id);
    store.renameSession(id, 'Gone, renamed');
    await sync.flushServerSync();
    expect(store.listSessions()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]);


    store.persistSession({ title: 'Other', segments: [line('b', 'hi', 0)], speakers: {} });
    store.adoptStoredMeeting(sampleMeeting({ id: 'stale-copy' }));
    meetingStore().delete('stale-copy');
    await sync.pullFromServer();
    await sync.flushServerSync();
    expect(store.listSessions().map((s) => s.title)).toEqual(['Other']);
    const db = readDb();
    expect(db.list().map((m) => m.title)).toEqual(['Other']);
    db.close();
  });

  it('a delete made offline is replayed when back online, and a save queued after it wins over the delete', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-server-adopt')), ...(await import('./session-delete')) };
    const keep = store.persistSession({ title: 'Keep', segments: [line('a', 'keep me', 0)], speakers: {} });
    const gone = store.persistSession({ title: 'Gone', segments: [line('b', 'drop me', 0)], speakers: {} });
    await sync.flushServerSync();
    harness.online = false;
    store.deleteSession(gone);
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).remove).toEqual([gone]);

    sync.queueMeetingSync(gone);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [gone], remove: [] });
    sync.queueMeetingDelete(gone);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [gone] });
    harness.online = true;
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [] });
    const db = readDb();
    expect(db.get(gone)).toBeNull();
    expect(db.deletedIds()).toContain(gone);
    expect(db.get(keep)?.title).toBe('Keep');
    db.close();
  });

  it('Delete all: a browser that still holds its meetings cannot bring them back, and tabs never sent get 410s dropped', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-server-adopt')), ...(await import('./session-delete')) };
    const id = store.persistSession({ title: 'Secret', segments: [line('a', 'launch codes', 0)], speakers: {} });
    await sync.flushServerSync();

    const { meetingStore } = await import('@/lib/meeting-db/meeting-store');
    meetingStore().deleteAll();

    store.renameSession(id, 'Secret v2');
    await sync.flushServerSync();
    await sync.pullFromServer();
    await sync.flushServerSync();
    expect(store.listSessions()).toEqual([]);
    const db = readDb();
    expect(db.list()).toEqual([]);
    expect(db.get(id)).toBeNull();
    db.close();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [] });
  });

  it('deleteAllOnServer empties the DB, forgets queued saves and returns false when offline', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-server-adopt')), ...(await import('./session-delete')) };
    const id = store.persistSession({ title: 'One', segments: [line('a', 'alpha', 0)], speakers: {} });
    await sync.flushServerSync();
    harness.online = false;
    expect(await sync.deleteAllOnServer()).toBe(false);
    harness.online = true;
    store.renameSession(id, 'One!');
    expect(await sync.deleteAllOnServer()).toBe(true);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [] });
    const db = readDb();
    expect(db.list()).toEqual([]);
    expect(db.deletedIds()).toEqual([id]);
    db.close();
  });

  it('tells about the migration once per DB, not again after the browser is cleared', async () => {
    let sync = await loadSync();
    const events: unknown[] = [];
    const onEvent = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener(sync.MIGRATED_EVENT, onEvent);
    (await import('./session-crud')).persistSession({ title: 'Kept', segments: [line('a', 'x', 0)], speakers: {} });
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 1 });

    await reload({ clear: true });
    sync = await loadSync();
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 0 });
    expect(localStorage.getItem(sync.MIGRATED_KEY)).not.toBeNull();
    window.removeEventListener(sync.MIGRATED_EVENT, onEvent);
    expect(events).toHaveLength(1);
  });
});
