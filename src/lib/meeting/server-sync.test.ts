// @vitest-environment jsdom
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingsDb } from '@/lib/meeting-db/db';
import { meetingsDbPath } from '@/lib/meeting-db/paths';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { DELETE as deleteAllRoute, GET as listRoute } from '@/app/api/meetings/route';
import { DELETE as deleteRoute, GET as getRoute, PUT as putRoute } from '@/app/api/meetings/[id]/route';
import { POST as importRoute } from '@/app/api/meetings/import/route';

/**
 * The browser side of the meetings DB, with `fetch` wired straight to the
 * real route handlers over a DB in a temp folder: what the app writes through
 * the session store ends up on disk, the browser's old meetings move over
 * once, and the MCP server finds what the app saved.
 */

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;
let online = true;
const calls: string[] = [];

async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!online) throw new TypeError('Failed to fetch');
  const url = new URL(String(input), 'http://localhost:3000');
  const method = (init.method ?? 'GET').toUpperCase();
  calls.push(`${method} ${url.pathname}`);
  const request = new Request(url, { ...init, headers: { ...(init.headers as object), host: 'localhost:3000' } });
  const match = url.pathname.match(/^\/api\/meetings(?:\/(.+))?$/);
  if (!match) return new Response('not found', { status: 404 });
  if (match[1] === 'import') return importRoute(request);
  if (!match[1]) return method === 'DELETE' ? deleteAllRoute(request) : listRoute(request);
  const ctx = { params: Promise.resolve({ id: decodeURIComponent(match[1]) }) };
  if (method === 'PUT') return putRoute(request, ctx);
  if (method === 'DELETE') return deleteRoute(request, ctx);
  return getRoute(request, ctx);
}

beforeEach(() => {
  vi.resetModules();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-sync-'));
  env.MEETING_NOTER_DATA_DIR = dir;
  localStorage.clear();
  online = true;
  calls.length = 0;
  vi.stubGlobal('fetch', fakeFetch);
});

afterEach(async () => {
  const sync = await import('./server-sync');
  sync.stopServerSyncForTests();
  vi.unstubAllGlobals();
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const line = (id: string, text: string, start: number) => ({
  id, source: 'mic' as const, speaker: 'mic:0', text, start, end: start + 2, final: true,
});

function readDb(): MeetingsDb {
  return new MeetingsDb(meetingsDbPath(), { readOnly: true });
}

describe('server sync', () => {
  it('sends nothing before startServerSync', async () => {
    const { persistSession } = await import('./session-store');
    persistSession({ title: 'Quiet', segments: [line('a', 'hello', 0)], speakers: {} });
    await new Promise((r) => setTimeout(r, 1100));
    expect(calls).toEqual([]);
  });

  it('moves the browser meetings and an unfiled autosave into the DB once, and says so', async () => {
    const { persistSession } = await import('./session-store');
    const { saveAutosavedSession } = await import('./persist');
    const { addDecision } = await import('./notes');
    const a = persistSession({ title: 'Kickoff', segments: [line('a1', 'welcome everyone', 0)], speakers: {}, startedAt: 1_000 });
    addDecision(a, 'Weekly demos on Thursday');
    persistSession({ title: 'Retro', segments: [line('b1', 'what went well', 0)], speakers: {} });
    // A crash before the session was filed: only the autosave slot has it.
    saveAutosavedSession({ sessionId: 'crashed-1', title: 'Crashed call', segments: [line('c1', 'lost words', 0)], speakers: {} });
    localStorage.removeItem('mn.session.crashed-1.v1');

    const sync = await import('./server-sync');
    const events: unknown[] = [];
    window.addEventListener(sync.MIGRATED_EVENT, (e) => events.push((e as CustomEvent).detail));
    const result = await sync.migrateBrowserMeetings();
    expect(result).toMatchObject({ imported: 3, skipped: 0, invalid: 0, dataDir: dir });
    expect(events).toEqual([result]);

    const db = readDb();
    expect(db.list().map((m) => m.title).sort()).toEqual(['Crashed call', 'Kickoff', 'Retro']);
    expect(db.search('thursday').map((m) => m.id)).toEqual([a]);
    db.close();
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toHaveLength(3);

    // Second start: the flag stops it here…
    expect(await sync.migrateBrowserMeetings()).toBeNull();
    // …and without the flag the server skips what it has.
    localStorage.removeItem(sync.MIGRATED_KEY);
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 0, skipped: 3 });
  });

  it('retries the migration on the next start when the server is down', async () => {
    const { persistSession } = await import('./session-store');
    persistSession({ title: 'Offline', segments: [line('a', 'hi', 0)], speakers: {} });
    const sync = await import('./server-sync');
    online = false;
    expect(await sync.migrateBrowserMeetings()).toBeNull();
    expect(localStorage.getItem(sync.MIGRATED_KEY)).toBeNull();
    online = true;
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 1 });
  });

  it('writes changes through to the DB and keeps them queued while offline', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const { persistSession, renameSession, deleteSession } = await import('./session-store');
    online = false;
    const id = persistSession({ title: 'Design review', segments: [line('a', 'the blue button', 0)], speakers: {} });
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([id]);

    online = true;
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

  it('pulls meetings the browser lacks, with transcript and notes', async () => {
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().save(sampleMeeting({ id: 'from-disk' }));
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const { listSessions, openSession } = await import('./session-store');
    const { getNotes } = await import('./notes');
    expect(listSessions().map((s) => s.sessionId)).toContain('from-disk');
    // The list entry comes first; the transcript when the meeting is opened.
    expect(localStorage.getItem('mn.session.from-disk.v1')).toBeNull();
    expect(await sync.ensureMeetingLoaded('from-disk')).toBe(true);
    expect(openSession('from-disk')?.segments.map((s) => s.text)).toEqual([
      'Let us look at the quarterly budget.',
      'We ship the café export on Friday.',
    ]);
    expect(getNotes('from-disk').decisions[0].text).toBe('Freeze the scope');
    // Adopting is not a local change: nothing goes back.
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1') ?? '{"save":[]}').save).toEqual([]);
  });

  it('loads every saved meeting back from the DB after the browser data is cleared', async () => {
    let sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const { addDecision } = await import('./notes');
    const id = store.persistSession({ title: 'Budget', segments: [line('a', 'cut the travel line', 0)], speakers: {} });
    addDecision(id, 'No travel in Q1');
    await sync.flushServerSync();

    await reload({ clear: true });
    sync = await import('./server-sync');
    await sync.startServerSync();
    const after = await import('./session-store');
    const { getNotes } = await import('./notes');
    expect(after.listSessions().map((s) => s.sessionId)).toEqual([id]);
    await sync.ensureMeetingLoaded(id);
    expect(after.openSession(id)?.segments.map((s) => s.text)).toEqual(['cut the travel line']);
    expect(getNotes(id).decisions.map((d) => d.text)).toEqual(['No travel in Q1']);
  });

  it('replays edits made offline once the browser is back online, without duplicates', async () => {
    let sync = await import('./server-sync');
    await sync.startServerSync();
    let store = await import('./session-store');
    online = false;
    const a = store.persistSession({ title: 'Standup', segments: [line('a', 'yesterday I', 0)], speakers: {} });
    const b = store.createDraftSession('Planning');
    store.renameSession(a, 'Standup Monday');
    await sync.flushServerSync();

    // A reload while still offline keeps the queue and sends nothing.
    await reload();
    sync = await import('./server-sync');
    await sync.startServerSync();
    store = await import('./session-store');
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save.sort()).toEqual([a, b].sort());
    store.renameSession(b, 'Planning Q1');

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]));
    await sync.flushServerSync();
    const db = readDb();
    expect(db.list().map((m) => [m.id, m.title]).sort()).toEqual([[a, 'Standup Monday'], [b, 'Planning Q1']].sort());
    db.close();
  });

  it('sends a meeting the server lacks even when its queue entry was lost', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    online = false;
    const id = store.persistSession({ title: 'Orphan', segments: [line('a', 'only here', 0)], speakers: {} });
    localStorage.removeItem('mn.sync.pending.v1');
    online = true;
    await sync.pullFromServer();
    await sync.flushServerSync();
    const db = readDb();
    expect(db.get(id)?.title).toBe('Orphan');
    db.close();
  });

  it('pulls what the DB gained while the browser was offline when it comes back', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    online = false;
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().save(sampleMeeting({ id: 'other-browser' }));
    online = true;
    window.dispatchEvent(new Event('online'));
    const { listSessions } = await import('./session-store');
    await vi.waitFor(() => expect(listSessions().map((s) => s.sessionId)).toContain('other-browser'));
  });
});

describe('deleted meetings and the one-time migration notice', () => {
  it('drops a meeting another browser deleted and never sends it back', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const id = store.persistSession({ title: 'Gone', segments: [line('a', 'bye', 0)], speakers: {} });
    await sync.flushServerSync();
    // Another browser deletes it; this one edits its stale copy meanwhile.
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().delete(id);
    store.renameSession(id, 'Gone, renamed');
    await sync.flushServerSync();
    expect(store.listSessions()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]);

    // A browser that still has it from before learns of the delete on pull.
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
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const keep = store.persistSession({ title: 'Keep', segments: [line('a', 'keep me', 0)], speakers: {} });
    const gone = store.persistSession({ title: 'Gone', segments: [line('b', 'drop me', 0)], speakers: {} });
    await sync.flushServerSync();
    online = false;
    store.deleteSession(gone);
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).remove).toEqual([gone]);
    // Queue order: a later save of the same id replaces its queued delete, a later delete replaces its save.
    sync.queueMeetingSync(gone);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [gone], remove: [] });
    sync.queueMeetingDelete(gone);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [gone] });
    online = true;
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [] });
    const db = readDb();
    expect(db.get(gone)).toBeNull();
    expect(db.deletedIds()).toContain(gone);
    expect(db.get(keep)?.title).toBe('Keep');
    db.close();
  });

  it('Delete all: a browser that still holds its meetings cannot bring them back, and tabs never sent get 410s dropped', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const id = store.persistSession({ title: 'Secret', segments: [line('a', 'launch codes', 0)], speakers: {} });
    await sync.flushServerSync();
    // Another tab/browser wipes the DB.
    const { meetingStore } = await import('@/lib/meeting-db/store');
    meetingStore().deleteAll();
    // This stale browser edits its copy and syncs, then pulls.
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
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const id = store.persistSession({ title: 'One', segments: [line('a', 'alpha', 0)], speakers: {} });
    await sync.flushServerSync();
    online = false;
    expect(await sync.deleteAllOnServer()).toBe(false);
    online = true;
    store.renameSession(id, 'One!');
    expect(await sync.deleteAllOnServer()).toBe(true);
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!)).toEqual({ save: [], remove: [] });
    const db = readDb();
    expect(db.list()).toEqual([]);
    expect(db.deletedIds()).toEqual([id]);
    db.close();
  });

  it('tells about the migration once per DB, not again after the browser is cleared', async () => {
    let sync = await import('./server-sync');
    const events: unknown[] = [];
    const onEvent = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener(sync.MIGRATED_EVENT, onEvent);
    (await import('./session-store')).persistSession({ title: 'Kept', segments: [line('a', 'x', 0)], speakers: {} });
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 1 });

    await reload({ clear: true });
    sync = await import('./server-sync');
    expect(await sync.migrateBrowserMeetings()).toMatchObject({ imported: 0 });
    expect(localStorage.getItem(sync.MIGRATED_KEY)).not.toBeNull();
    window.removeEventListener(sync.MIGRATED_EVENT, onEvent);
    expect(events).toHaveLength(1);
  });
});

describe('localStorage holds only unsent edits and the open meeting', () => {
  const transcriptKey = (id: string) => `mn.session.${id}.v1`;
  const notesKey = (id: string) => `mn.notes.v1.${id}`;

  it('drops the transcript and notes of a meeting once the server has them, but not of the open one', async () => {
    const sync = await import('./server-sync');
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
    online = false;
    await sync.flushServerSync();
    // Unsent: everything stays.
    expect(localStorage.getItem(transcriptKey(closed))).not.toBeNull();

    online = true;
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
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const { addAction, getNotes } = await import('./notes');
    const id = store.persistSession({ title: 'Kept whole', segments: [line('a', 'every word', 0)], speakers: {} });
    addAction(id, 'Write it up');
    await sync.flushServerSync();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();

    // Renamed from the list while offline: it waits rather than going up empty.
    online = false;
    store.renameSession(id, 'Kept whole v2');
    await sync.flushServerSync();
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([id]);

    online = true;
    await sync.flushServerSync();
    const db = readDb();
    const stored = db.get(id)!;
    db.close();
    expect(stored.title).toBe('Kept whole v2');
    expect(stored.segments.map((s) => s.text)).toEqual(['every word']);
    expect(stored.notes.actions.map((a) => a.text)).toEqual(['Write it up']);
    expect(getNotes(id).actions).toEqual([]); // dropped again once sent
  });

  it('finds a dropped transcript through the DB search', async () => {
    const sync = await import('./server-sync');
    expect(await sync.searchMeetingIds('quarterly')).toBeNull(); // nothing sent before start
    await sync.startServerSync();
    const store = await import('./session-store');
    const id = store.persistSession({ title: 'Finance', segments: [line('a', 'quarterly budget review', 0)], speakers: {} });
    await sync.flushServerSync();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();
    expect(await sync.searchMeetingIds('budget')).toEqual(new Set([id]));
  });
});

describe('participants and speaker names are meeting data in the DB', () => {
  const participantsKey = (id: string) => `mn.participants.${id}.v1`;
  const transcriptKey = (id: string) => `mn.session.${id}.v1`;

  it('sends the participants, drops the local copy once synced and brings it back on open', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
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
    // Adopted, not edited: nothing queued.
    expect(JSON.parse(localStorage.getItem('mn.sync.pending.v1')!).save).toEqual([]);

    // A skipped question round-trips as asked-with-nobody.
    const draft = store.createDraftSession('Later');
    setParticipants(draft, []);
    await sync.flushServerSync();
    db = readDb();
    expect(db.get(draft)?.participants).toEqual([]);
    db.close();
    await reload({ clear: true });
    const sync2 = await import('./server-sync');
    await sync2.startServerSync();
    expect(await sync2.ensureMeetingLoaded(draft)).toBe(true);
    expect((await import('./participants')).hasAskedParticipants(draft)).toBe(true);
  });

  it('deleting a meeting scrubs its participants here and in the DB, keeping recent names', async () => {
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
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
    const sync = await import('./server-sync');
    await sync.startServerSync();
    const store = await import('./session-store');
    const { saveAutosavedSession } = await import('./persist');
    const speakers = { 'mic:0': { id: 'mic:0', source: 'mic' as const, label: 'Speaker 0', colorIndex: 0 } };
    const id = store.persistSession({ title: 'Named later', segments: [line('a', 'hello there', 0)], speakers });
    await sync.flushServerSync();
    // Opened again and "Who is this?" answered: the view's autosave writes the new label.
    expect(await sync.ensureMeetingLoaded(id)).toBe(true);
    saveAutosavedSession({
      sessionId: id,
      title: 'Named later',
      segments: [line('a', 'hello there', 0)],
      speakers: { 'mic:0': { ...speakers['mic:0'], label: 'Marieke' } },
    });
    // Another meeting opened: the first is no longer on screen and may be dropped.
    saveAutosavedSession({ sessionId: 'other', title: 'Other', segments: [line('o', 'next', 0)], speakers: {} });
    await sync.flushServerSync();
    const db = readDb();
    expect(db.get(id)?.speakers['mic:0'].label).toBe('Marieke');
    db.close();
    expect(localStorage.getItem(transcriptKey(id))).toBeNull();
  });
});

/** A page reload: the modules start over; with `clear`, so does localStorage. */
async function reload({ clear = false } = {}): Promise<void> {
  (await import('./server-sync')).stopServerSyncForTests();
  vi.resetModules();
  if (clear) localStorage.clear();
}

describe('end to end: the app saves, the MCP server finds it', () => {
  it('a meeting saved through the session store is returned by search_meetings over stdio', async () => {
    const root = path.resolve(__dirname, '../../..');
    const bundle = path.join(dir, 'meetings-mcp.mjs');
    execFileSync(process.execPath, [path.join(root, 'node_modules/rolldown/bin/cli.mjs'), '-c', 'scripts/mcp/rolldown.config.mjs'], {
      cwd: root,
      env: { ...process.env, MCP_OUT: bundle },
      stdio: 'ignore',
    });

    const sync = await import('./server-sync');
    await sync.startServerSync();
    const { persistSession } = await import('./session-store');
    const { addAction } = await import('./notes');
    const id = persistSession({
      title: 'Supplier call',
      segments: [line('s1', 'The invoice for the zeppelin parts is late again', 3)],
      speakers: { 'mic:0': { id: 'mic:0', source: 'mic', label: 'Sanne', colorIndex: 0 } },
      startedAt: Date.UTC(2026, 10, 12, 9),
    });
    addAction(id, 'Chase the invoice', { ownerName: 'Sanne' });
    await sync.flushServerSync();

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [bundle],
      env: { MEETING_NOTER_DATA_DIR: dir },
      stderr: 'ignore',
    });
    const client = new Client({ name: 'e2e', version: '1.0.0' });
    await client.connect(transport);
    try {
      const res = (await client.callTool({ name: 'search_meetings', arguments: { query: 'zeppelin invoice' } })) as {
        content: { text: string }[];
      };
      const hits = JSON.parse(res.content[0].text);
      expect(hits.map((h: { id: string }) => h.id)).toEqual([id]);
      expect(hits[0]).toMatchObject({ title: 'Supplier call', speakers: ['Sanne'] });
      const md = (await client.callTool({ name: 'get_meeting', arguments: { id } })) as { content: { text: string }[] };
      expect(md.content[0].text).toContain('- [ ] Chase the invoice (Sanne)');
      expect(md.content[0].text).toContain('[00:03] Sanne: The invoice for the zeppelin parts is late again');
    } finally {
      await client.close();
    }
  }, 30_000);
});
