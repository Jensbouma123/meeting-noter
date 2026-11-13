import { vi } from 'vitest';
import { folder } from './fixtures';
import type { FakeServerState, RecordedCall, RequestBody } from './types';

export const fake: { server: FakeServerState; calls: RecordedCall[] } = {
  server: { folders: [], meetings: {}, nextId: 1 },
  calls: [],
};

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function collectSubtree(rootId: string): Set<string> {
  const subtree = new Set([rootId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of fake.server.folders) {
      if (f.parentId && subtree.has(f.parentId) && !subtree.has(f.id)) {
        subtree.add(f.id);
        grew = true;
      }
    }
  }
  return subtree;
}

function deleteFolderRoute(id: string, mode: string): Response {
  const { server } = fake;
  const target = server.folders.find((x) => x.id === id);
  if (!target) return json(404, { ok: false, error: 'not-found' });
  const subtree = collectSubtree(id);
  const affected = Object.entries(server.meetings).filter(([, fid]) => fid && subtree.has(fid));
  if (mode === 'delete-contents') {
    for (const [mid] of affected) delete server.meetings[mid];
  } else {
    for (const [mid] of affected) server.meetings[mid] = target.parentId;
    for (const f of server.folders) if (f.parentId === id) f.parentId = target.parentId;
  }
  server.folders = server.folders.filter((x) => !subtree.has(x.id) || (mode === 'move-up' && x.id !== id));
  return json(200, { ok: true, deleted: { folders: subtree.size, meetings: mode === 'delete-contents' ? affected.length : 0 } });
}

function patchFolderRoute(id: string, body: RequestBody): Response {
  const f = fake.server.folders.find((x) => x.id === id);
  if (!f) return json(404, { ok: false, error: 'not-found' });
  if ('name' in body) f.name = String(body.name);
  if ('parentId' in body) f.parentId = body.parentId as string | null;
  if ('index' in body) {
    const sib = fake.server.folders.filter((x) => x.parentId === f.parentId && x !== f);
    sib.splice(body.index as number, 0, f);
    fake.server.folders = [...fake.server.folders.filter((x) => x.parentId !== f.parentId), ...sib];
  }
  return json(200, { ok: true, folder: f });
}

function routeRequest(url: string, init?: RequestInit): Response {
  const { server } = fake;
  const method = init?.method ?? 'GET';
  const body = init?.body ? (JSON.parse(init.body as string) as RequestBody) : {};
  const [path, query] = url.split('?');
  if (path === '/api/folders' && method === 'GET') return json(200, { ok: true, folders: server.folders });
  if (path === '/api/folders' && method === 'POST') {
    const f = folder(`n${server.nextId++}`, (body.parentId as string | null) ?? null, String(body.name));
    server.folders.push(f);
    return json(201, { ok: true, folder: f });
  }
  if (path === '/api/meetings' && method === 'GET') {
    return json(200, { ok: true, meetings: Object.entries(server.meetings).map(([id, folderId]) => ({ id, folderId })) });
  }
  const meetingFolderMatch = /^\/api\/meetings\/([^/]+)\/folder$/.exec(path);
  if (meetingFolderMatch && method === 'PUT') {
    server.meetings[meetingFolderMatch[1]] = body.folderId as string | null;
    return json(200, { ok: true });
  }
  const folderMatch = /^\/api\/folders\/([^/]+)$/.exec(path);
  if (folderMatch && method === 'PATCH') return patchFolderRoute(folderMatch[1], body);
  if (folderMatch && method === 'DELETE') return deleteFolderRoute(folderMatch[1], new URLSearchParams(query).get('mode') ?? 'move-up');
  return json(404, { ok: false, error: 'not-found' });
}

export function installFakeFolderServer() {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  fake.server = {
    folders: [folder('a', null, 'Work'), folder('b', 'a', 'Q1')],
    meetings: { m1: 'b' },
    nextId: 1,
  };
  fake.calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    fake.calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    return routeRequest(url, init);
  });
}

export const mutations = (method: string) => fake.calls.filter((c) => c.method === method);
