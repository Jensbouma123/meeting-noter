export const standInServerSource = (broken) => `import { createServer } from 'node:http';
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
