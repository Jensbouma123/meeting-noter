#!/usr/bin/env node
// End-to-end test of the in-app update ("Bijwerken"), macOS only:
//   node scripts/installer/update-e2e.mjs        (KEEP=1 keeps the temp dir)
//
// Installs a fake release with this tree's install.sh and launcher.sh into a
// scratch HOME and MEETING_NOTER_ROOT under $TMPDIR, on a free port, from a
// local HTTP server that plays GitHub (releases API, latest/download). Its
// server.js stands in for Next.js but runs the real src/lib/update/server-update.ts
// the way src/app/api/app/update/route.ts does, so POST /api/app/update takes
// the same startUpdate path as the button. Then it updates:
//   1. to a good release: the new version serves, user files and models survive;
//   2. to a release whose .sha256 does not match,
//   3. whose download is cut off halfway: the old server never stops;
//   4. whose server does not start: install.sh rolls back to the old version;
//   5. to a good release again.
// It never touches ~/Library/Application Support/Meeting Noter, launchd or port 3000.
import { spawn } from 'node:child_process';
import { closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const ASSET = 'meeting-noter-macos-arm64.tar.gz';
const MODEL = 'models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';

if (process.platform !== 'darwin') {
  console.log('update-e2e: skipped, install.sh runs on macOS only');
  process.exit(0);
}
if (!process.features.typescript) {
  console.error('update-e2e: needs Node.js >= 22.18 (runs server-update.ts with type stripping)');
  process.exit(1);
}

const tmp = mkdtempSync(path.join(realpathSync(tmpdir()), 'mn-update-e2e-'));
const home = path.join(tmp, 'home');
const root = path.join(home, 'Library/Application Support/Meeting Noter');
const realRoot = path.join(homedir(), 'Library/Application Support/Meeting Noter');
if (!root.startsWith(`${tmp}/`) || root === realRoot) throw new Error(`refusing to install into ${root}`);
mkdirSync(home, { recursive: true });

let failures = 0;
function check(ok, what, info = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}${ok || !info ? '' : `\n      ${String(info).replace(/\n/g, '\n      ')}`}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (file) => readFileSync(path.join(root, file), 'utf8');

/**
 * Runs a command without blocking this process (it also serves the release).
 * Output goes to a file, not a pipe: the server install.sh starts in the
 * background inherits the pipe, which would then never close.
 */
let runs = 0;
function run(cmd, args, env) {
  const log = path.join(tmp, `run-${++runs}.log`);
  const fd = openSync(log, 'w');
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', fd, fd] });
    closeSync(fd);
    child.on('exit', (code) => resolve({ code, out: readFileSync(log, 'utf8') }));
  });
}

// ---- Fake releases -------------------------------------------------------------

const SERVER_JS = (broken) => `// Stand-in for the Next.js server: the update calls of src/app/api/app/update/route.ts.
import { createServer } from 'node:http';
import { buildCheck, fetchRelease } from './release-check.ts';
import { detectInstall } from './detect-install.ts';
import { startUpdate } from './start-update.ts';
import { readUpdateStatus, updateRunning } from './update-files.ts';
if (${broken}) { console.error('update-e2e: this release does not start'); process.exit(1); }
const install = detectInstall();
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
createServer(async (req, res) => {
  if (req.url === '/api/app/status') return json(res, 200, { app: 'meeting-noter', version: install.current, pid: process.pid, installKind: install.kind });
  if (req.url === '/api/app/update/status') return json(res, 200, readUpdateStatus(install.stateDir));
  if (req.url === '/api/app/update' && req.method === 'POST') {
    const check = buildCheck(install, await fetchRelease(install.current), updateRunning(install.stateDir));
    if (!check.canApply || !check.latest) return json(res, 409, { ok: false, error: check.applyBlockedReason ?? 'already-latest' });
    try { return json(res, 202, { ok: true, status: startUpdate(install, check.latest) }); }
    catch (err) { console.error(err); return json(res, 500, { ok: false, error: 'start-failed' }); }
  }
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<title>Meeting Noter ' + install.current + '</title>'); }
  json(res, 404, {});
}).listen(Number(process.env.PORT), process.env.HOSTNAME);
`;

/** Builds a release dir with install.sh, the tarball and its .sha256, like a GitHub release. */
async function makeRelease(version, { broken = false } = {}) {
  const dir = path.join(tmp, 'releases', version);
  const stage = path.join(dir, 'stage', 'meeting-noter');
  for (const d of ['node/bin', 'server', 'launcher', 'helper']) mkdirSync(path.join(stage, d), { recursive: true });
  symlinkSync(process.execPath, path.join(stage, 'node/bin/node'));
  writeFileSync(path.join(stage, 'server/package.json'), '{"type":"module"}\n');
  writeFileSync(path.join(stage, 'server/server.js'), SERVER_JS(broken));
  for (const f of readdirSync(path.join(repo, 'src/lib/update')).filter((n) => n.endsWith('.ts') && !n.includes('.test.') && n !== 'test-fixtures.ts')) {
    const src = readFileSync(path.join(repo, 'src/lib/update', f), 'utf8').replace(/from '(\.\/[\w-]+)'/g, "from '$1.ts'");
    writeFileSync(path.join(stage, 'server', f), src);
  }
  copyFileSync(path.join(repo, 'src/lib/update/version.mjs'), path.join(stage, 'server/version.mjs'));
  copyFileSync(path.join(here, 'launcher.sh'), path.join(stage, 'launcher/launcher.sh'));
  writeFileSync(path.join(stage, 'launcher/AppIcon.icns'), 'icns');
  writeFileSync(path.join(stage, 'helper/meeting-noter-audio-helper'), '#!/bin/sh\n# fake helper\n', { mode: 0o755 });
  copyFileSync(path.join(here, 'uninstall.sh'), path.join(stage, 'uninstall.sh'));
  writeFileSync(path.join(stage, 'VERSION'), `${version}\n`);
  writeFileSync(path.join(stage, 'ARCH'), 'arm64\n');
  const tar = await run('/usr/bin/tar', ['-czf', path.join(dir, ASSET), '-C', path.dirname(stage), 'meeting-noter'], { ...process.env, COPYFILE_DISABLE: '1' });
  if (tar.code !== 0) throw new Error(tar.out);
  const sum = createHash('sha256').update(readFileSync(path.join(dir, ASSET))).digest('hex');
  writeFileSync(path.join(dir, `${ASSET}.sha256`), `${sum}  ${ASSET}\n`);
  copyFileSync(path.join(here, 'install.sh'), path.join(dir, 'install.sh'));
  return { version, dir, sum, cut: false };
}

// ---- Fake GitHub ---------------------------------------------------------------

let latest = null;
const github = createServer((req, res) => {
  if (req.url === '/api/releases/latest') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({
      tag_name: `v${latest.version}`,
      name: `v${latest.version}`,
      html_url: 'http://example.invalid/release',
      body: 'e2e',
      published_at: new Date().toISOString(),
      assets: [{ name: ASSET }, { name: `${ASSET}.sha256` }],
    }));
  }
  const name = req.url.startsWith('/latest/download/') ? req.url.slice('/latest/download/'.length) : null;
  const file = name && ['install.sh', ASSET, `${ASSET}.sha256`].includes(name) ? path.join(latest.dir, name) : null;
  if (!file) { res.writeHead(404); return res.end(); }
  const body = readFileSync(file);
  res.writeHead(200, { 'content-length': body.length });
  if (name === ASSET && latest.cut) {
    // The connection drops halfway: curl sees fewer bytes than announced.
    res.write(body.subarray(0, body.length >> 1), () => setTimeout(() => res.socket.destroy(), 50));
    return;
  }
  res.end(body);
});
await new Promise((r) => github.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${github.address().port}`;

const free = createServer();
await new Promise((r) => free.listen(0, '127.0.0.1', r));
const port = free.address().port;
await new Promise((r) => free.close(r));
const app = `http://127.0.0.1:${port}`;

const env = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: home,
  USER: process.env.USER ?? '',
  LANG: 'nl_NL.UTF-8',
  TMPDIR: tmp,
  MEETING_NOTER_ROOT: root,
  MEETING_NOTER_PORT: String(port),
  MEETING_NOTER_DOWNLOAD_BASE: `${base}/latest/download`,
  MEETING_NOTER_INSTALL_URL: `${base}/latest/download/install.sh`,
  MEETING_NOTER_RELEASES_URL: `${base}/api/releases/latest`,
  MEETING_NOTER_NO_LAUNCHD: '1',
  MEETING_NOTER_RUN_SERVER: '1',
  MEETING_NOTER_SKIP_GPU_MODEL: '1',
  MEETING_NOTER_NO_OPEN: '1',
};

async function getJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
const appStatus = () => getJson(`${app}/api/app/status`);

/** Clicks "Bijwerken": the POST the dialog sends, then its status polling until the job ends. */
async function bijwerken() {
  const res = await fetch(`${app}/api/app/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' },
    body: '{}',
  });
  const started = await res.json();
  if (res.status !== 202) return { started, final: null, phases: [] };
  const phases = new Set();
  const until = Date.now() + 120_000;
  while (Date.now() < until) {
    await sleep(500);
    const s = await getJson(`${app}/api/app/update/status`);
    if (!s) { phases.add('(server down)'); continue; }
    if (s.phase) phases.add(s.phase);
    if (s.state === 'done' || s.state === 'failed') return { started, final: s, phases: [...phases] };
  }
  return { started, final: null, phases: [...phases] };
}

const USER_FILES = {
  [MODEL]: 'seed-model',
  'data/meeting-e2e.json': '{"note":"a user file next to app/"}',
  'bin/uv': 'seed-uv',
  'logs/model-build.log': 'seed-log',
};
function userFilesIntact() {
  const bad = Object.entries(USER_FILES).filter(([f, body]) => !existsSync(path.join(root, f)) || read(f) !== body);
  return { ok: bad.length === 0, bad: bad.map(([f]) => f).join(', ') };
}
function noLeftovers() {
  const left = ['app.old', 'app.new', 'app.failed'].filter((d) => existsSync(path.join(root, d)));
  return { ok: left.length === 0, left: left.join(', ') };
}

async function expectUpdated(rel) {
  const { started, final, phases } = await bijwerken();
  check(started.ok === true, 'POST /api/app/update starts the updater', JSON.stringify(started));
  check(final?.state === 'done' && final.code === 'updated' && final.toVersion === rel.version, `status: done, updated to ${rel.version}`, JSON.stringify(final));
  console.log(`      phases seen: ${phases.join(' → ')}`);
  const s = await appStatus();
  check(s?.version === rel.version, `the new server answers on the same origin with ${rel.version}`, JSON.stringify(s));
  const page = await fetch(`${app}/`).then((r) => r.text()).catch((e) => String(e));
  check(page.includes(rel.version), 'it serves the page', page);
  check(read('app/VERSION').trim() === rel.version, 'app/VERSION is the new version');
  check(read('installed.sha256').trim() === rel.sum, 'installed.sha256 records the new tarball');
  const files = userFilesIntact();
  check(files.ok, 'models, user and state files survived', files.bad);
  check(readlinkSync(path.join(root, 'app/server/public/models')) === path.join(root, 'models')
    && readFileSync(path.join(root, 'app/server/public', MODEL), 'utf8') === 'seed-model',
  'the models dir is linked into the new app');
  const left = noLeftovers();
  check(left.ok, 'no app.old / app.new / app.failed left', left.left);
}

async function expectKept(rel, { what, detail, code, restarted }) {
  const before = await appStatus();
  const { started, final } = await bijwerken();
  check(started.ok === true, 'POST /api/app/update starts the updater', JSON.stringify(started));
  check(final?.state === 'failed' && final.code === code, `status: failed (${code})`, JSON.stringify(final));
  check(!!final?.detail && final.detail.includes(detail), `the error says "${detail}"`, final?.detail);
  const after = await appStatus();
  check(after?.version === before?.version, `${before?.version} still serves after ${what}`, JSON.stringify(after));
  if (!restarted) check(after?.pid === before?.pid, 'the old server was never stopped', `${before?.pid} -> ${after?.pid}`);
  check(read('app/VERSION').trim() === before?.version, 'app/VERSION is unchanged');
  check(read('installed.sha256').trim() !== rel.sum, `installed.sha256 does not claim ${rel.version}`);
  const files = userFilesIntact();
  check(files.ok, 'models, user and state files survived', files.bad);
  const left = noLeftovers();
  check(left.ok, 'no app.old / app.new / app.failed left', left.left);
}

/** Stops the test server: server.pid can be launcher's bash wrapper, so also whatever node of ours listens on the port. */
async function stopServer() {
  const pids = new Set();
  try { pids.add(Number(read('server.pid').trim())); } catch { /* no pid file */ }
  const lsof = await run('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], process.env);
  for (const pid of lsof.out.split(/\s+/).filter(Boolean)) {
    const cwd = await run('/usr/sbin/lsof', ['-p', pid, '-a', '-d', 'cwd', '-Fn'], process.env);
    if (cwd.out.includes(`n${root}/`)) pids.add(Number(pid));
  }
  for (const pid of pids) {
    try { if (pid > 0) process.kill(pid); } catch { /* gone */ }
  }
}

try {
  console.log(`update-e2e: root ${root}, port ${port}`);
  console.log('\nInstall 1.0.0 (curl install.sh | bash)');
  latest = await makeRelease('1.0.0');
  const install = await run('/bin/bash', ['-c', 'curl -fsSL "$MEETING_NOTER_INSTALL_URL" | bash'], env);
  check(install.code === 0, 'install.sh installs 1.0.0', install.out);
  check((await appStatus())?.version === '1.0.0', '1.0.0 serves');
  for (const [file, body] of Object.entries(USER_FILES)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), body);
  }

  console.log('\n1. Update to 1.0.1');
  latest = await makeRelease('1.0.1');
  await expectUpdated(latest);

  console.log('\n2. Update to a release with a wrong checksum');
  latest = await makeRelease('1.0.2');
  writeFileSync(path.join(latest.dir, `${ASSET}.sha256`), `${'0'.repeat(64)}  ${ASSET}\n`);
  await expectKept(latest, { what: 'a bad checksum', detail: 'Controlesom klopt niet', code: 'failed' });

  console.log('\n3. Update whose download is cut off');
  latest = await makeRelease('1.0.3');
  latest.cut = true;
  await expectKept(latest, { what: 'a cut-off download', detail: 'Download mislukt', code: 'failed' });

  console.log('\n4. Update to a release whose server does not start');
  latest = await makeRelease('1.0.4', { broken: true });
  await expectKept(latest, { what: 'the rollback', detail: 'Meeting Noter 1.0.4 startte niet', code: 'rolled-back', restarted: true });

  console.log('\n5. Update to a good release after the rollback');
  latest = await makeRelease('1.0.5');
  await expectUpdated(latest);
} catch (err) {
  check(false, 'unexpected error', err?.stack ?? err);
} finally {
  await stopServer();
  github.close();
  if (process.env.KEEP) console.log(`\nkept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\nupdate-e2e: ${failures} check(s) failed` : '\nupdate-e2e: all checks passed');
process.exit(failures ? 1 : 0);
