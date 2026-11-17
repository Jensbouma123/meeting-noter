import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { legacyBridge } from '@/lib/legacy-origin/legacy-bridge';
import { GET, POST } from './route';

const req = (method: string, headers: Record<string, string>) =>
  new Request('http://localhost:47823/api/app/legacy-origin', { method, headers, body: method === 'POST' ? '{}' : undefined });
const FOREIGN: Record<string, string>[] = [{ host: 'evil.example:47823' }, { host: 'localhost:47823', origin: 'http://localhost:3000' }];
const LOCAL = { host: 'localhost:47823', 'content-type': 'application/json' };

describe('/api/app/legacy-origin', () => {
  afterEach(() => delete (globalThis as Record<symbol, unknown>)[Symbol.for('meeting-noter.legacy-origin')]);

  it.each(FOREIGN)('refuses %j', async (headers) => {
    expect(GET(req('GET', headers)).status).toBe(403);
    expect(POST(req('POST', { ...headers, 'content-type': 'application/json' })).status).toBe(403);
  });

  it('reports the state and completes only a listening migration', () => {
    expect(GET(req('GET', LOCAL))).toBeTruthy();
    expect(POST(req('POST', LOCAL)).status).toBe(409);
    expect(POST(req('POST', { host: 'localhost:47823', 'content-type': 'text/plain' })).status).toBe(415);
    const root = mkdtempSync(path.join(tmpdir(), 'mn-legacy-route-'));
    let closed = false;
    Object.assign(legacyBridge(), { state: 'listening', root, close: () => { closed = true; } });
    try {
      expect(POST(req('POST', LOCAL)).status).toBe(200);
      expect(closed).toBe(true);
      expect(legacyBridge().state).toBe('done');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
