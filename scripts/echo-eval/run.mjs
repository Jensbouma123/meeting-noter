import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.ECHO_EVAL_OUT ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval';
const AUDIO = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
const fake = process.argv.includes('--fake');
const POLL_MS = 5000;
const READY_TIMEOUT_MS = 120_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function waitFor(url) {
  const until = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`dev server not ready at ${url}`);
}

function openBrowser(url) {
  const chrome = spawnSync('open', ['-a', 'Google Chrome', url], { stdio: 'ignore' });
  if (chrome.status === 0) return true;
  const fallback = spawnSync('open', [url], { stdio: 'ignore' });
  return fallback.status === 0;
}

spawnSync(process.execPath, [path.join(root, 'src/lib/ort-paths/copy-ort-wasm.mjs')], { cwd: root, stdio: 'inherit' });

const port = await freePort();
const next = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '-p', String(port)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ECHO_EVAL_OUT: OUT, ECHO_EVAL_AUDIO: AUDIO },
});
const stop = (code) => {
  next.kill('SIGTERM');
  process.exit(code);
};
process.on('SIGINT', () => stop(130));

const base = `http://localhost:${port}`;
const q = `${limit ? `&limit=${limit}` : ''}${fake ? '&fake=1' : ''}`;
const runUrl = `${base}/dev/echo-eval?autostart=1${q}`;
fs.rmSync(path.join(OUT, fake ? 'finished.fake.json' : 'finished.json'), { force: true });
await waitFor(`${base}/api/dev/echo-eval?op=status${q}`);
if (!openBrowser(runUrl)) {
  console.log(`[echo-eval] could not open browser automatically; open this URL manually:\n  ${runUrl}`);
}
console.log(`[echo-eval] ${runUrl} running; output ${OUT}`);

for (;;) {
  await sleep(POLL_MS);
  const s = await (await fetch(`${base}/api/dev/echo-eval?op=status${q}`)).json();
  console.log(`[echo-eval] ${s.done}/${s.total}`);
  if (s.error) {
    console.error(`[echo-eval] failed: ${s.error}`);
    stop(1);
  }
  if (s.finished) {
    console.log(`[echo-eval] report: ${path.join(OUT, 'report.md')}`);
    stop(0);
  }
}
