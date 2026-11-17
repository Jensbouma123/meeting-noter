import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { ASSET } from './constants.mjs';

export async function startFakeGithub(currentRelease) {
  const github = createServer((req, res) => {
    const latest = currentRelease();
    if (req.url === '/api/releases/latest') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(
        JSON.stringify({
          tag_name: `v${latest.version}`,
          name: `v${latest.version}`,
          html_url: 'http://example.invalid/release',
          body: 'e2e',
          published_at: new Date().toISOString(),
          assets: [{ name: ASSET }, { name: `${ASSET}.sha256` }],
        }),
      );
    }
    const prefix = '/latest/download/';
    const name = req.url.startsWith(prefix) ? req.url.slice(prefix.length) : null;
    const served = ['install.sh', ASSET, `${ASSET}.sha256`];
    const file = name && served.includes(name) ? path.join(latest.dir, name) : null;
    if (!file) {
      res.writeHead(404);
      return res.end();
    }
    const body = readFileSync(file);
    res.writeHead(200, { 'content-length': body.length });
    if (name === ASSET && latest.cut) {
      const cutAt = body.length >> 1;
      res.write(body.subarray(0, cutAt), () => {
        setTimeout(() => res.socket.destroy(), 50);
      });
      return;
    }
    res.end(body);
  });
  await new Promise((r) => github.listen(0, '127.0.0.1', r));
  return { github, base: `http://127.0.0.1:${github.address().port}` };
}

export async function findFreePort() {
  const probe = createServer();
  await new Promise((r) => probe.listen(0, '127.0.0.1', r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  return port;
}
