// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOLDERS_CHANGED_EVENT, declineFolderSuggestion, fetchDeclinedSuggestions } from './folders-api';

let calls: { url: string; init?: RequestInit }[];
let next: Response;

beforeEach(() => {
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return next;
  });
});

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('folder suggestion api', () => {
  it('declineFolderSuggestion PUTs the folder id and announces a change', async () => {
    next = reply({ ok: true });
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
    next = reply({ ok: true, meetings: [{ id: 'm1', folderSuggestionDeclined: ['a'] }, { id: 'm2' }] });
    await expect(fetchDeclinedSuggestions()).resolves.toEqual({ m1: ['a'], m2: [] });
  });
});
