import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getFolders, POST as post } from '../route';
import { PATCH as patch } from './route';

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-context-'));
  env.MEETING_NOTER_DATA_DIR = dir;
});
afterEach(() => {
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const LOCAL = { host: 'localhost:3000', 'content-type': 'application/json' };
const req = (method: string, p: string, body?: unknown, headers: Record<string, string> = LOCAL) =>
  new Request(`http://localhost:3000/api${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function createFolder(name: string): Promise<string> {
  const res = await post(req('POST', '/folders', { name }));
  return ((await res.json()) as { folder: { id: string } }).folder.id;
}
async function setContext(id: string, body: unknown, headers: Record<string, string> = LOCAL) {
  const res = await patch(req('PATCH', `/folders/${id}`, body, headers), ctx(id));
  return { status: res.status, json: (await res.json()) as { ok: boolean; error?: string; folder?: { context: string } } };
}
async function storedContext(id: string): Promise<string | undefined> {
  const folders = ((await (await getFolders(req('GET', '/folders'))).json()) as { folders: Array<{ id: string; context: string }> }).folders;
  return folders.find((f) => f.id === id)?.context;
}

describe('PATCH /api/folders/:id context (review060)', () => {
  it('accepts a context of exactly 1000 characters', async () => {
    const id = await createFolder('Boundary');
    const text = 'a'.repeat(1000);
    const out = await setContext(id, { context: text });
    expect(out.status).toBe(200);
    expect(await storedContext(id)).toBe(text);
  });

  it('clears the context with an empty string and with whitespace only', async () => {
    const id = await createFolder('Clearable');
    await setContext(id, { context: 'weekly syncs' });
    expect((await setContext(id, { context: '' })).status).toBe(200);
    expect(await storedContext(id)).toBe('');
    await setContext(id, { context: 'weekly syncs' });
    expect((await setContext(id, { context: '   \n\t ' })).json.folder?.context).toBe('');
    expect(await storedContext(id)).toBe('');
  });

  it('rejects non-string context values with 400 bad-context and keeps the stored text', async () => {
    const id = await createFolder('Types');
    await setContext(id, { context: 'kept' });
    for (const bad of [5, true, ['a'], { text: 'a' }]) {
      const out = await setContext(id, { context: bad });
      expect(out.status).toBe(400);
      expect(out.json.error).toBe('bad-context');
    }
    expect(await storedContext(id)).toBe('kept');
  });

  it('stores SQL and markup-looking text verbatim and leaves other folders intact', async () => {
    const victim = await createFolder('Victim');
    const id = await createFolder('Attacker');
    const payload = `  '); DROP TABLE folders; -- <img src=x onerror="alert(1)"> %s {{x}}  `;
    const out = await setContext(id, { context: payload });
    expect(out.status).toBe(200);
    expect(await storedContext(id)).toBe(payload.trim());
    expect(await storedContext(victim)).toBe('');
    const names = ((await (await getFolders(req('GET', '/folders'))).json()) as { folders: Array<{ name: string }> }).folders.map((f) => f.name);
    expect(names.sort()).toEqual(['Attacker', 'Victim']);
  });

  it('rejects a request body over 10 KB with 413 before touching the context', async () => {
    const id = await createFolder('Huge');
    await setContext(id, { context: 'kept' });
    const out = await setContext(id, { context: 'x', padding: 'p'.repeat(10_001) });
    expect(out.status).toBe(413);
    expect(await storedContext(id)).toBe('kept');
  });

  it('refuses a foreign origin with 403 and does not write the context', async () => {
    const id = await createFolder('Foreign');
    const out = await setContext(id, { context: 'evil' }, { ...LOCAL, origin: 'https://evil.example' });
    expect(out.status).toBe(403);
    expect(await storedContext(id)).toBe('');
  });

  it('returns 404 for an unknown folder id even when the context is valid', async () => {
    const out = await setContext('f-missing', { context: 'hello' });
    expect(out.status).toBe(404);
  });
});
