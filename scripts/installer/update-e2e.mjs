#!/usr/bin/env node
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET, USER_FILES } from './e2e/constants.mjs';
import { check, failureCount } from './e2e/reporter.mjs';
import { createCommandRunner } from './e2e/run-command.mjs';
import { createReleaseBuilder } from './e2e/make-release.mjs';
import { findFreePort, startFakeGithub } from './e2e/fake-github.mjs';
import { createAppClient } from './e2e/app-client.mjs';
import { createInstallState } from './e2e/install-state.mjs';
import { createExpectations } from './e2e/expectations.mjs';
import { stopTestServer } from './e2e/stop-server.mjs';

const installerDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(installerDir, '../..');

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

const run = createCommandRunner(tmp);
const makeRelease = createReleaseBuilder({ tmp, repo, installerDir, run });

let latest = null;
const { github, base } = await startFakeGithub(() => latest);
const port = await findFreePort();
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

const client = createAppClient(app);
const installState = createInstallState(root);
const { expectUpdated, expectKept } = createExpectations({ app, root, client, installState });

try {
  console.log(`update-e2e: root ${root}, port ${port}`);
  console.log('\nInstall 1.0.0 (curl install.sh | bash)');
  latest = await makeRelease('1.0.0');
  const install = await run('/bin/bash', ['-c', 'curl -fsSL "$MEETING_NOTER_INSTALL_URL" | bash'], env);
  check(install.code === 0, 'install.sh installs 1.0.0', install.out);
  const serves = (await client.appStatus())?.version === '1.0.0';
  check(serves, '1.0.0 serves', serves ? '' : installState.serverLogTail());
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
  await stopTestServer({ root, port, run, read: installState.read });
  github.close();
  if (process.env.KEEP) console.log(`\nkept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });
}

const failures = failureCount();
console.log(failures ? `\nupdate-e2e: ${failures} check(s) failed` : '\nupdate-e2e: all checks passed');
process.exit(failures ? 1 : 0);
