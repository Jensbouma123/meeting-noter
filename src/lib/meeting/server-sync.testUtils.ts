import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, vi } from 'vitest';
import { MeetingsDb } from '@/lib/meeting-db/db';
import { meetingsDbPath } from '@/lib/meeting-db/paths';
import { DELETE as deleteAllRoute, GET as listRoute } from '@/app/api/meetings/route';
import { DELETE as deleteRoute, GET as getRoute, PUT as putRoute } from '@/app/api/meetings/[id]/route';
import { POST as importRoute } from '@/app/api/meetings/import/route';

export const harness = { dir: '', online: true };
export const calls: string[] = [];
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;


async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!harness.online) throw new TypeError('Failed to fetch');
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

export async function loadSync() {
  const [queue, flush, control, pull, loader, migrate, stored] = await Promise.all([
    import('./sync-queue'),
    import('./sync-flush'),
    import('./sync-control'),
    import('./sync-pull'),
    import('./meeting-loader'),
    import('./sync-migrate'),
    import('./stored-meeting'),
  ]);
  return { ...queue, ...flush, ...control, ...pull, ...loader, ...migrate, ...stored };
}

export function setupServerSyncTest(): void {
  beforeEach(() => {
    vi.resetModules();
    harness.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-sync-'));
    env.MEETING_NOTER_DATA_DIR = harness.dir;
    localStorage.clear();
    harness.online = true;
    calls.length = 0;
    vi.stubGlobal('fetch', fakeFetch);
  });

  afterEach(async () => {
    const sync = await loadSync();
    sync.stopServerSyncForTests();
    vi.unstubAllGlobals();
    if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
    else env.MEETING_NOTER_DATA_DIR = prevDir;
    fs.rmSync(harness.dir, { recursive: true, force: true });
  });
}


export const line = (id: string, text: string, start: number) => ({
  id, source: 'mic' as const, speaker: 'mic:0', text, start, end: start + 2, final: true,
});

export function readDb(): MeetingsDb {
  return new MeetingsDb(meetingsDbPath(), { readOnly: true });
}

export async function reload({ clear = false } = {}): Promise<void> {
  (await loadSync()).stopServerSyncForTests();
  vi.resetModules();
  if (clear) localStorage.clear();
}
