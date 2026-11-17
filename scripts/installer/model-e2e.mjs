#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL } from './e2e/constants.mjs';
import { check, failureCount } from './e2e/reporter.mjs';
import { createCommandRunner } from './e2e/run-command.mjs';
import { createReleaseBuilder } from './e2e/make-release.mjs';
import { findFreePort, startFakeGithub } from './e2e/fake-github.mjs';
import { MODEL_HOST_MODES, startFakeReleaseModelHost } from './e2e/fake-model-host.mjs';
import { createAppClient } from './e2e/app-client.mjs';
import { stopTestServer } from './e2e/stop-server.mjs';

const installerDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(installerDir, '../..');
if (process.platform !== 'darwin') {
  console.log('model-e2e: skipped, install.sh runs on macOS only');
  process.exit(0);
}

const tmp = mkdtempSync(path.join(realpathSync(tmpdir()), 'mn-model-e2e-'));
const home = path.join(tmp, 'home');
const root = path.join(home, 'Library/Application Support/Meeting Noter');
mkdirSync(home, { recursive: true });
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

const realModel = process.env.MODEL_E2E_FILE;
const modelSource = realModel ?? path.join(tmp, 'encoder-model.q4f16.onnx');
if (!realModel) writeFileSync(modelSource, 'stand-in prebuilt encoder');
const uv = path.join(tmp, 'fake-uv');
writeFileSync(
  uv,
  '#!/bin/bash\nwhile [ $# -gt 0 ]; do [ "$1" = --outdir ] && out=$2; shift; done\necho run >> "$HOME/uv-calls"\nmkdir -p "$out"; printf converted > "$out/encoder-model.q4f16.onnx"\n',
  { mode: 0o755 },
);

const run = createCommandRunner(tmp);
const makeRelease = createReleaseBuilder({ tmp, repo, installerDir, run });
let latest = null;
let mode = MODEL_HOST_MODES.ok;
const { github, base } = await startFakeGithub(() => latest);
const host = await startFakeReleaseModelHost(modelSource, () => mode);
const port = await findFreePort();
const client = createAppClient(`http://127.0.0.1:${port}`);
const env = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: home,
  USER: process.env.USER ?? '',
  TMPDIR: tmp,
  MEETING_NOTER_ROOT: root,
  MEETING_NOTER_PORT: String(port),
  MEETING_NOTER_DOWNLOAD_BASE: `${base}/latest/download`,
  MEETING_NOTER_INSTALL_URL: `${base}/latest/download/install.sh`,
  MEETING_NOTER_NO_LAUNCHD: '1',
  MEETING_NOTER_RUN_SERVER: '1',
  MEETING_NOTER_NO_OPEN: '1',
  MEETING_NOTER_MODEL_URL: host.url,
  MEETING_NOTER_UV: uv,
  ...(realModel ? {} : { MEETING_NOTER_MODEL_SHA256: sha(modelSource) }),
};
const installed = path.join(root, MODEL);
const uvRuns = () =>
  existsSync(path.join(home, 'uv-calls'))
    ? readFileSync(path.join(home, 'uv-calls'), 'utf8').trim().split('\n').length
    : 0;
const install = (extra = {}) =>
  run('/bin/bash', ['-c', 'curl -fsSL "$MEETING_NOTER_INSTALL_URL" | bash -s -- --gpu-model'], { ...env, ...extra });

async function expectFallback(what, m, extra = {}) {
  console.log(`\n${what}`);
  rmSync(installed, { force: true });
  mode = m;
  const before = uvRuns();
  const r = await install(extra);
  check(r.code === 0, 'install.sh succeeds', r.out);
  check(
    existsSync(installed) && readFileSync(installed, 'utf8') === 'converted',
    'falls back to the local build',
    r.out,
  );
  check(uvRuns() === before + 1, 'local build ran once');
  check(!existsSync(path.join(root, 'model-download.part')), 'no partial download left behind');
}

try {
  console.log(`model-e2e: root ${root}, model ${modelSource}${realModel ? ' (real, pinned sha)' : ''}`);
  console.log('\n1. Fresh install downloads the prebuilt model');
  latest = await makeRelease('1.0.0');
  const first = await install();
  check(first.code === 0, 'install.sh installs 1.0.0', first.out);
  check(
    existsSync(installed) && sha(installed) === sha(modelSource),
    'installed model is byte-identical to the release asset',
    first.out,
  );
  check(uvRuns() === 0, 'no local build');
  check(existsSync(path.join(root, 'app/server/public', MODEL)), 'served under public/models');
  check((await client.appStatus())?.version === '1.0.0', 'server runs after the model restart');

  console.log('\n2. Update run with the model present');
  const requests = host.requests;
  const again = await install();
  check(again.code === 0 && again.out.includes('al aanwezig'), 'keeps the present model', again.out);
  check(host.requests === requests && uvRuns() === 0, 'no download, no build');

  await expectFallback('3. Cut-off download', MODEL_HOST_MODES.cutHalfway);
  await expectFallback('4. sha256 mismatch', MODEL_HOST_MODES.wrongBytes);
  await expectFallback('5. Missing asset (404)', MODEL_HOST_MODES.missing);
  await expectFallback('6. No network (connection refused)', MODEL_HOST_MODES.ok, {
    MEETING_NOTER_MODEL_URL: `http://127.0.0.1:${await findFreePort()}/x`,
  });

  console.log('\n7. MEETING_NOTER_SKIP_GPU_MODEL=1');
  rmSync(installed, { force: true });
  mode = MODEL_HOST_MODES.ok;
  const [reqs, builds] = [host.requests, uvRuns()];
  const skip = await install({ MEETING_NOTER_SKIP_GPU_MODEL: '1' });
  check(skip.code === 0 && !existsSync(installed), 'installs without a model', skip.out);
  check(host.requests === reqs && uvRuns() === builds, 'no download, no build');
} catch (err) {
  check(false, 'unexpected error', err?.stack ?? err);
} finally {
  await stopTestServer({ root, port, run, read: (f) => readFileSync(path.join(root, f), 'utf8') });
  github.close();
  host.server.close();
  if (process.env.KEEP) console.log(`\nkept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });
}

const failures = failureCount();
console.log(failures ? `\nmodel-e2e: ${failures} check(s) failed` : '\nmodel-e2e: all checks passed');
process.exit(failures ? 1 : 0);
