// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOLDERS_CHANGED_EVENT,
  createFolder,
  deleteFolder,
  fetchFolders,
  fetchDeclinedSuggestions,
  declineFolderSuggestion,
  fetchMeetingFolders,
  moveFolder,
  moveMeeting,
  renameFolder,
} from './folders-api';
import type { MockReply } from './types';

let replies: MockReply[];
let calls: { url: string; init?: RequestInit }[];

const reply = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  replies = [];
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = replies.shift();
    if (!next) throw new Error('no reply queued');
    if (next instanceof Error) throw next;
    return next;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('folders-api reads', () => {
  it('fetchFolders returns the rows from GET /api/folders', async () => {
    const folders = [{ id: 'a', parentId: null, name: 'Work', sort: 0, createdAt: 0, updatedAt: 0 }];
    replies.push(reply(200, { ok: true, folders }));
    await expect(fetchFolders()).resolves.toEqual(folders);
    expect(calls[0].url).toBe('/api/folders');
    expect(calls[0].init?.method).toBeUndefined();
    expect(calls[0].init?.cache).toBe('no-store');
  });

  it('fetchFolders resolves null on HTTP or network failure instead of throwing', async () => {
    replies.push(reply(500, { ok: false, error: 'boom' }));
    await expect(fetchFolders()).resolves.toBeNull();
    replies.push(new TypeError('offline'));
    await expect(fetchFolders()).resolves.toBeNull();
  });

  it('fetchMeetingFolders maps each meeting to its folder, defaulting to null', async () => {
    replies.push(reply(200, { ok: true, meetings: [{ id: 'm1', folderId: 'a' }, { id: 'm2' }, { id: 'm3', folderId: null }] }));
    await expect(fetchMeetingFolders()).resolves.toEqual({ m1: 'a', m2: null, m3: null });
    expect(calls[0].url).toBe('/api/meetings');
  });

  it('fetchMeetingFolders resolves null when the list call fails', async () => {
    replies.push(reply(503, { ok: false, error: 'busy' }));
    await expect(fetchMeetingFolders()).resolves.toBeNull();
  });
});

describe('folders-api writes', () => {
  it('createFolder posts name and parentId and returns the new folder', async () => {
    const folder = { id: 'n1', parentId: 'a', name: 'New folder', sort: 0, createdAt: 0, updatedAt: 0 };
    replies.push(reply(201, { ok: true, folder }));
    await expect(createFolder('New folder', 'a')).resolves.toEqual({ ok: true, folder });
    expect(calls[0].url).toBe('/api/folders');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ name: 'New folder', parentId: 'a' });
  });

  it('renameFolder PATCHes the encoded id with the name', async () => {
    replies.push(reply(200, { ok: true, folder: { id: 'a/b' } }));
    await renameFolder('a/b', 'Renamed');
    expect(calls[0].url).toBe('/api/folders/a%2Fb');
    expect(calls[0].init?.method).toBe('PATCH');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ name: 'Renamed' });
  });

  it('moveFolder sends parentId null for the top level', async () => {
    replies.push(reply(200, { ok: true, folder: {} }));
    await moveFolder('b', null);
    expect(calls[0].url).toBe('/api/folders/b');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ parentId: null });
  });

  it('deleteFolder passes the mode as a query parameter', async () => {
    replies.push(reply(200, { ok: true, deleted: { folders: 2, meetings: 3 } }));
    await expect(deleteFolder('a', 'delete-contents')).resolves.toEqual({ ok: true, deleted: { folders: 2, meetings: 3 } });
    expect(calls[0].url).toBe('/api/folders/a?mode=delete-contents');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('moveMeeting PUTs the folder id, with null to unfile', async () => {
    replies.push(reply(200, { ok: true }));
    await moveMeeting('m 1', null);
    expect(calls[0].url).toBe('/api/meetings/m%201/folder');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ folderId: null });
  });

  it('declineFolderSuggestion PUTs the folder id and announces a change', async () => {
    replies.push(reply(200, { ok: true }));
    const seen = vi.fn();
    window.addEventListener(FOLDERS_CHANGED_EVENT, seen);
    await declineFolderSuggestion('m 1', 'f1');
    window.removeEventListener(FOLDERS_CHANGED_EVENT, seen);
    expect(calls[0].url).toBe('/api/meetings/m%201/folder-suggestion');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ folderId: 'f1' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('fetchDeclinedSuggestions maps meeting ids to declined folder ids', async () => {
    replies.push(reply(200, { ok: true, meetings: [{ id: 'm1', folderSuggestionDeclined: ['a'] }, { id: 'm2' }] }));
    await expect(fetchDeclinedSuggestions()).resolves.toEqual({ m1: ['a'], m2: [] });
  });

  it('surfaces the server error code, such as a cycle, without throwing', async () => {
    replies.push(reply(409, { ok: false, error: 'cycle' }));
    await expect(moveFolder('a', 'b')).resolves.toEqual({ ok: false, error: 'cycle' });
  });

  it('treats a 200 with ok:false as a failure', async () => {
    replies.push(reply(200, { ok: false, error: 'bad-name' }));
    await expect(renameFolder('a', 'x')).resolves.toEqual({ ok: false, error: 'bad-name' });
  });

  it('falls back to an http-status code when the error body is not JSON', async () => {
    replies.push(new Response('<html>oops</html>', { status: 502 }));
    await expect(createFolder('x', null)).resolves.toEqual({ ok: false, error: 'http-502' });
  });

  it('reports a network error as "network"', async () => {
    replies.push(new TypeError('Failed to fetch'));
    await expect(deleteFolder('a', 'move-up')).resolves.toEqual({ ok: false, error: 'network' });
  });
});

describe('folders-api change notification', () => {
  it('dispatches mn:folders-changed after a successful write', async () => {
    const seen = vi.fn();
    window.addEventListener(FOLDERS_CHANGED_EVENT, seen);
    replies.push(reply(200, { ok: true }));
    await moveMeeting('m1', 'a');
    expect(seen).toHaveBeenCalledTimes(1);
    window.removeEventListener(FOLDERS_CHANGED_EVENT, seen);
  });

  it('does not dispatch after a failed write, and reads never dispatch', async () => {
    const seen = vi.fn();
    window.addEventListener(FOLDERS_CHANGED_EVENT, seen);
    replies.push(reply(409, { ok: false, error: 'cycle' }));
    await moveFolder('a', 'b');
    replies.push(reply(200, { ok: true, folders: [] }));
    await fetchFolders();
    expect(seen).not.toHaveBeenCalled();
    window.removeEventListener(FOLDERS_CHANGED_EVENT, seen);
  });
});
