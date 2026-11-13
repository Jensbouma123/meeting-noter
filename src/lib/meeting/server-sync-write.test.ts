// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calls, harness, line, loadSync, readDb, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('server sync', () => {
  it('keeps a server filing when the browser syncs a meeting without folderId', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const sessions = { ...(await import('./session-crud')), ...(await import('./session-open')) };
    const id = sessions.persistSession({ title: 'Filed sync', segments: [line('f1', 'folder survives', 0)], speakers: {} });
    await sync.flushServerSync();

    const { meetingStore } = await import('@/lib/meeting-db/meeting-store');
    const folder = meetingStore().createFolder('Keep filed');
    meetingStore().moveMeeting(id, folder.id);
    sessions.renameSession(id, 'Filed sync edited');
    await sync.flushServerSync();

    const db = readDb();
    expect(db.get(id)).toMatchObject({ title: 'Filed sync edited', folderId: folder.id });
    db.close();
  });

  it('persists lowConfSpans through the sync and hands them back on load', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const sessions = { ...(await import('./session-crud')), ...(await import('./session-open')) };
    const id = sessions.persistSession({
      title: 'Spans', speakers: {},
      segments: [{ ...line('w1', 'we ship with framna', 0), lowConfSpans: [[13, 19, 0.4]] }, line('w2', 'sure', 3)],
    });
    await sync.flushServerSync();

    const db = readDb();
    expect(db.get(id)!.segments.map((s) => s.lowConfSpans)).toEqual([[[13, 19, 0.4]], undefined]);
    db.close();

    localStorage.clear();
    expect(await sync.ensureMeetingLoaded(id)).toBe(true);
    expect(sessions.getFullSession(id)?.segments[0].lowConfSpans).toEqual([[13, 19, 0.4]]);
  });

  it('sends nothing before startServerSync', async () => {
    const { persistSession } = await import('./session-crud');
    persistSession({ title: 'Quiet', segments: [line('a', 'hello', 0)], speakers: {} });
    await new Promise((r) => setTimeout(r, 1100));
    expect(calls).toEqual([]);
  });

  it('moves the browser meetings and an unfiled autosave into the DB once, and says so', async () => {
    const { persistSession } = await import('./session-crud');
    const { saveAutosavedSession } = await import('./autosave');
    const { addDecision } = await import('./notes');
    const a = persistSession({ title: 'Kickoff', segments: [line('a1', 'welcome everyone', 0)], speakers: {}, startedAt: 1_000 });
    addDecision(a, 'Weekly demos on Thursday');
    persistSession({ title: 'Retro', segments: [line('b1', 'what went well', 0)], speakers: {} });

    saveAutosavedSession({ sessionId: 'crashed-1', title: 'Crashed call', segments: [line('c1', 'lost words', 0)], speakers: {} });
    localStorage.removeItem('mn.session.crashed-1.v1');

    const sync = await loadSync();
    const events: unknown[] = [];
    window.addEventListener(sync.MIGRATED_EVENT, (e) => events.push((e as CustomEvent).detail));
    const result = await sync.migrateBrowserMeetings();
    expect(result).toMatchObject({ imported: 3, skipped: 0, invalid: 0, dataDir: harness.dir });
    expect(events).toEqual([result]);

    const db = readDb();
    expect(db.list().map((m) => m.title).sort()).toEqual(['Crashed call', 'Kickoff', 'Retro']);
    expect(db.search('thursday').map((m) => m.id)).toEqual([a]);
    db.close();
    expect(fs.readdirSync(path.join(harness.dir, 'meetings'))).toHaveLength(3);


    expect(await sync.migrateBrowserMeetings()).toBeNull();

    localStorage.removeItem(sync.MIGRATED_KEY);
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 0, skipped: 3 });
  });

  it('retries the migration on the next start when the server is down', async () => {
    const { persistSession } = await import('./session-crud');
    persistSession({ title: 'Offline', segments: [line('a', 'hi', 0)], speakers: {} });
    const sync = await loadSync();
    harness.online = false;
    expect(await sync.migrateBrowserMeetings()).toBeNull();
    expect(localStorage.getItem(sync.MIGRATED_KEY)).toBeNull();
    harness.online = true;
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 1 });
  });

  it('writes changes through to the DB and keeps them queued while offline', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const { persistSession, renameSession } = await import('./session-crud');
    const { deleteSession } = await import('./session-delete');
    harness.online = false;
    const id = persistSession({ title: 'Design review', segments: [line('a', 'the blue button', 0)], speakers: {} });
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([id]);

    harness.online = true;
    renameSession(id, 'Design review v2');
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]);
    let db = readDb();
    expect(db.get(id)?.title).toBe('Design review v2');
    db.close();

    deleteSession(id);
    await sync.flushServerSync();
    db = readDb();
    expect(db.get(id)).toBeNull();
    db.close();
  });

});
