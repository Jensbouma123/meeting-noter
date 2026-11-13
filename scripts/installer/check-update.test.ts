import { execFile } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installableUpdate } from './check-update.mjs';

const assets = (...names: string[]) => names.map((name) => ({ name }));
const full = assets('meeting-noter-macos-arm64.tar.gz', 'meeting-noter-macos-arm64.tar.gz.sha256');

describe('installableUpdate', () => {
  it('returns the newer version when the tarball for this arch is attached', () => {
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: full }, '0.1.0', 'arm64')).toBe('0.2.0');
  });

  it('ignores a release that is not newer', () => {
    expect(installableUpdate({ tag_name: 'v0.1.0', assets: full }, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.0.9', assets: full }, '0.1.0', 'arm64')).toBeNull();
  });

  it('waits until the release workflow has uploaded this arch', () => {
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: [] }, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: full }, '0.1.0', 'x64')).toBeNull();
    expect(
      installableUpdate({ tag_name: 'v0.2.0', assets: assets('meeting-noter-macos-arm64.tar.gz') }, '0.1.0', 'arm64'),
    ).toBeNull();
  });

  it('survives malformed answers', () => {
    expect(installableUpdate(null, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.2.0' }, '0.1.0', 'arm64')).toBeNull();
  });
});

describe('check-update.mjs as run by launcher.sh', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir: string;
  let server: Server;
  let reply: { status: number; body: string };

  beforeAll(async () => {
    dir = mkdtempSync(path.join(realpathSync(tmpdir()), 'mn-check-update-'));
    mkdirSync(path.join(dir, 'installer'));
    writeFileSync(path.join(dir, 'VERSION'), '1.0.0\n');
    writeFileSync(path.join(dir, 'ARCH'), 'arm64\n');
    copyFileSync(path.join(here, 'check-update.mjs'), path.join(dir, 'installer/check-update.mjs'));
    copyFileSync(path.join(here, '../../src/lib/update/version.mjs'), path.join(dir, 'installer/version.mjs'));
    server = createServer((_req, res) => {
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(reply.body);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  });
  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const check = (url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`) =>
    new Promise<{ stdout: string; status: number }>((resolve) => {
      execFile(process.execPath, [path.join(dir, 'installer/check-update.mjs')],
        { env: { ...process.env, MEETING_NOTER_RELEASES_URL: url } },
        (err, stdout) => resolve({ stdout, status: err ? ((err as { code?: number }).code ?? 1) : 0 }));
    });
  const release = (tag: string, names: string[]) =>
    ({ status: 200, body: JSON.stringify({ tag_name: tag, assets: assets(...names) }) });

  it('prints the version only for a newer release that carries this arch', async () => {
    reply = release('v1.1.0', full.map((a) => a.name));
    expect((await check()).stdout).toBe('1.1.0\n');
    reply = release('v1.1.0', ['meeting-noter-macos-x64.tar.gz']);
    expect((await check()).stdout).toBe('');
    reply = release('v1.0.0', full.map((a) => a.name));
    expect((await check()).stdout).toBe('');
  });

  it('prints nothing and exits 0 on HTTP errors, junk and an unreachable server', async () => {
    reply = { status: 500, body: '{}' };
    expect(await check()).toMatchObject({ stdout: '', status: 0 });
    reply = { status: 200, body: 'not json' };
    expect(await check()).toMatchObject({ stdout: '', status: 0 });
    expect(await check('http://127.0.0.1:1/')).toMatchObject({ stdout: '', status: 0 });
  });
});
