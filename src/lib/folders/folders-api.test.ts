// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOLDERS_CHANGED_EVENT, fetchFolders, fetchMeetingFolders, moveFolder, moveMeeting } from './folders-api';
import { calls, reply, replies, resetFetch, restoreGlobals } from './folders-api.test-support';

beforeEach(resetFetch);
afterEach(restoreGlobals);

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
    replies.push(
      reply(200, { ok: true, meetings: [{ id: 'm1', folderId: 'a' }, { id: 'm2' }, { id: 'm3', folderId: null }] }),
    );
    await expect(fetchMeetingFolders()).resolves.toEqual({ m1: 'a', m2: null, m3: null });
    expect(calls[0].url).toBe('/api/meetings');
  });

  it('fetchMeetingFolders resolves null when the list call fails', async () => {
    replies.push(reply(503, { ok: false, error: 'busy' }));
    await expect(fetchMeetingFolders()).resolves.toBeNull();
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
