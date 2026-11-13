// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { line, loadSync, readDb, reload, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('participants and speaker names are meeting data in the DB', () => {
  const participantsKey = (id: string) => `mn.participants.${id}.v1`;
  const transcriptKey = (id: string) => `mn.session.${id}.v1`;

  it('sends the participants, drops the local copy once synced and brings it back on open', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-delete')) };
    const { setParticipants, getParticipants } = await import('./participants');
    const id = store.persistSession({ title: 'Standup', segments: [line('a', 'morning all', 0)], speakers: {} });
    await sync.flushServerSync();
    setParticipants(id, ['Anna', 'Jan']);
    await sync.flushServerSync();
    let db = readDb();
    expect(db.get(id)?.participants).toEqual(['Anna', 'Jan']);
    expect(db.search('Jan').map((h) => h.id)).toEqual([id]);
    db.close();
    expect(localStorage.getItem(participantsKey(id))).toBeNull();

    expect(await sync.ensureMeetingLoaded(id)).toBe(true);
    expect(getParticipants(id)).toEqual(['Anna', 'Jan']);

    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]);


    const draft = store.createDraftSession('Later');
    setParticipants(draft, []);
    await sync.flushServerSync();
    db = readDb();
    expect(db.get(draft)?.participants).toEqual([]);
    db.close();
    await reload({ clear: true });
    const sync2 = await loadSync();
    await sync2.startServerSync();
    expect(await sync2.ensureMeetingLoaded(draft)).toBe(true);
    expect((await import('./participants')).hasAskedParticipants(draft)).toBe(true);
  });

  it('deleting a meeting scrubs its participants here and in the DB, keeping recent names', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-delete')) };
    const { setParticipants, getRecentParticipants } = await import('./participants');
    const id = store.persistSession({ title: 'Secret', segments: [line('a', 'hush', 0)], speakers: {} });
    setParticipants(id, ['Noor']);
    store.deleteSession(id);
    expect(localStorage.getItem(participantsKey(id))).toBeNull();
    await sync.flushServerSync();
    const db = readDb();
    expect(db.get(id)).toBeNull();
    expect(db.search('Noor')).toEqual([]);
    db.close();
    expect(getRecentParticipants()).toEqual(['Noor']);

    setParticipants('orphan', ['Ghost']);
    store.sweepMeetingStorage(null);
    expect(localStorage.getItem(participantsKey('orphan'))).toBeNull();
    expect(getRecentParticipants()).toEqual(['Ghost', 'Noor']);
  });

  it('a speaker named after the meeting was saved reaches the DB and survives eviction', async () => {
    const sync = await loadSync();
    await sync.startServerSync();
    const store = { ...(await import('./session-crud')), ...(await import('./session-delete')) };
    const { saveAutosavedSession } = await import('./autosave');
    const speakers = { 'mic:0': { id: 'mic:0', source: 'mic' as const, label: 'Speaker 0', colorIndex: 0 } };
    const id = store.persistSession({ title: 'Named later', segments: [line('a', 'hello there', 0)], speakers });
    await sync.flushServerSync();

    expect(await sync.ensureMeetingLoaded(id)).toBe(true);
    saveAutosavedSession({
      sessionId: id,
      title: 'Named later',
      segments: [line('a', 'hello there', 0)],
      speakers: { 'mic:0': { ...speakers['mic:0'], label: 'Marieke' } },
    });

    saveAutosavedSession({ sessionId: 'other', title: 'Other', segments: [line('o', 'next', 0)], speakers: {} });
    await sync.flushServerSync();
    const db = readDb();
    expect(db.get(id)?.speakers['mic:0'].label).toBe('Marieke');
    db.close();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();
  });
});
