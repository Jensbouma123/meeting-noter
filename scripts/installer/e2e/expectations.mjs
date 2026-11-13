import { readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import { MODEL } from './constants.mjs';
import { check } from './reporter.mjs';

export function createExpectations({ app, root, client, installState }) {
  const { read, userFilesIntact, noLeftovers } = installState;

  async function expectUpdated(rel) {
    const { started, final, phases } = await client.clickUpdateAndWaitForEnd();
    check(started.ok === true, 'POST /api/app/update starts the updater', JSON.stringify(started));
    check(final?.state === 'done' && final.code === 'updated' && final.toVersion === rel.version, `status: done, updated to ${rel.version}`, JSON.stringify(final));
    console.log(`      phases seen: ${phases.join(' → ')}`);
    const s = await client.appStatus();
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
    const before = await client.appStatus();
    const { started, final } = await client.clickUpdateAndWaitForEnd();
    check(started.ok === true, 'POST /api/app/update starts the updater', JSON.stringify(started));
    check(final?.state === 'failed' && final.code === code, `status: failed (${code})`, JSON.stringify(final));
    check(!!final?.detail && final.detail.includes(detail), `the error says "${detail}"`, final?.detail);
    const after = await client.appStatus();
    check(after?.version === before?.version, `${before?.version} still serves after ${what}`, JSON.stringify(after));
    if (!restarted) check(after?.pid === before?.pid, 'the old server was never stopped', `${before?.pid} -> ${after?.pid}`);
    check(read('app/VERSION').trim() === before?.version, 'app/VERSION is unchanged');
    check(read('installed.sha256').trim() !== rel.sum, `installed.sha256 does not claim ${rel.version}`);
    const files = userFilesIntact();
    check(files.ok, 'models, user and state files survived', files.bad);
    const left = noLeftovers();
    check(left.ok, 'no app.old / app.new / app.failed left', left.left);
  }

  return { expectUpdated, expectKept };
}
