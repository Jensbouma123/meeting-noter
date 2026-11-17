import { afterEach, beforeEach, vi } from 'vitest';
import type { MockReply } from './types';

export const fetchMock: { replies: MockReply[]; calls: { url: string; init?: RequestInit }[] } = {
  replies: [],
  calls: [],
};

export const reply = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export function installFolderFetchMock() {
  beforeEach(() => {
    fetchMock.replies.length = 0;
    fetchMock.calls.length = 0;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      fetchMock.calls.push({ url, init });
      const next = fetchMock.replies.shift();
      if (!next) throw new Error('no reply queued');
      if (next instanceof Error) throw next;
      return next;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
