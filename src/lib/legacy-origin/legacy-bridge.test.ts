import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DONE_MARKER, PENDING_MARKER } from './constants';
import { completeLegacyBridge, legacyBridge, startLegacyBridge } from './legacy-bridge';

const APP = 47823;
let root = '';
let port = 0;
let blocker: Server | null = null;

const freePort = async () => {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const p = (s.address() as { port: number }).port;
  await new Promise((r) => s.close(r));
  return p;
};
const status = async () => (await fetch(`http://127.0.0.1:${port}/api/app/status`)).status;
const start = (serverPort = APP) => startLegacyBridge(root, serverPort, '0.6.0', { port, appPort: APP });

describe.skipIf(typeof fetch !== 'function')('startLegacyBridge', () => {
  beforeEach(async () => {
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('meeting-noter.legacy-origin')];
    root = mkdtempSync(path.join(tmpdir(), 'mn-legacy-'));
    port = await freePort();
  });
  afterEach(async () => {
    legacyBridge().close?.();
    if (blocker) await new Promise((r) => blocker?.close(r));
    blocker = null;
    rmSync(root, { recursive: true, force: true });
  });

  it('does nothing without a pending marker (fresh install)', async () => {
    expect((await start()).state).toBe('none');
    await expect(status()).rejects.toThrow();
  });

  it('listens on the old port while pending, and stops for good once completed', async () => {
    writeFileSync(path.join(root, PENDING_MARKER), '');
    expect((await start()).state).toBe('listening');
    expect(await status()).toBe(200);
    expect(completeLegacyBridge().state).toBe('done');
    expect(existsSync(path.join(root, DONE_MARKER))).toBe(true);
    expect(existsSync(path.join(root, PENDING_MARKER))).toBe(false);
    await expect(status()).rejects.toThrow();
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('meeting-noter.legacy-origin')];
    expect((await start()).state).toBe('done');
  });

  it('skips without blocking when the old port is busy, and keeps the marker for a later launch', async () => {
    writeFileSync(path.join(root, PENDING_MARKER), '');
    blocker = createServer();
    await new Promise<void>((r) => blocker?.listen(port, '127.0.0.1', r));
    expect((await start()).state).toBe('busy');
    expect(existsSync(path.join(root, PENDING_MARKER))).toBe(true);
  });

  it('stays off when the server does not run on the app port (test installs)', async () => {
    writeFileSync(path.join(root, PENDING_MARKER), '');
    expect((await start(APP + 1)).state).toBe('none');
  });

  it('closes itself when the window runs out', async () => {
    writeFileSync(path.join(root, PENDING_MARKER), '');
    const bridge = await startLegacyBridge(root, APP, '0.6.0', { port, appPort: APP, windowMs: 50 });
    expect(bridge.state).toBe('listening');
    await new Promise((r) => setTimeout(r, 150));
    expect(legacyBridge().state).toBe('expired');
    await expect(status()).rejects.toThrow();
  });
});
