import { vi } from 'vitest';
import type { MockReply } from './types';

export let replies: MockReply[] = [];
export let calls: { url: string; init?: RequestInit }[] = [];

export const reply = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export function resetFetch(): void {
  replies = [];
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = replies.shift();
    if (!next) throw new Error('no reply queued');
    if (next instanceof Error) throw next;
    return next;
  });
}

export function restoreGlobals(): void {
  vi.unstubAllGlobals();
}
