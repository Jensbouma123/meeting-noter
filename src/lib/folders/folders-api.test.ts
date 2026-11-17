// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fetchFolders, fetchMeetingFolders } from './folders-api';
import { fetchMock, installFolderFetchMock, reply } from './folders-api.testSupport';

installFolderFetchMock();
const { replies, calls } = fetchMock;

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
