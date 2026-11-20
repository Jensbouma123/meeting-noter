import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_GRID_SHARDS, gridUrl } from './lib/grid-url.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.ECHO_EVAL_OUT ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval';
const AUDIO = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
const shardsArg = process.argv.find((a) => a.startsWith('--shards='));
const shards = shardsArg ? Number(shardsArg.split('=')[1]) : 1;
const fake = process.argv.includes('--fake');
const meetings = process.env.ECHO_EVAL_SET === 'meetings';
const POLL_MS = 5000;
const READY_TIMEOUT_MS = 120_000;
if (!Number.isInteger(shards) || shards < 1 || shards > MAX_GRID_SHARDS) {
  console.error(`[echo-eval] --shards must be an integer from 1 to ${MAX_GRID_SHARDS}, got ${shardsArg}`);
  process.exit(2);
}
const sharded = shards > 1;
const shardQs = sharded ? Array.from({ length: shards }, (_, i) => `&shard=${i}&shards=${shards}`) : [''];

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
const q = `${limit ? `&limit=${limit}` : ''}${fake ? '&fake=1' : ''}${meetings ? '&set=meetings' : ''}`;
const runUrls = shardQs.map((sq) => `${base}/dev/echo-eval?autostart=1${q}${sq}`);
const marker = `finished${meetings ? '.meetings' : ''}${fake ? '.fake' : ''}`;
for (const name of [marker, ...shardQs.filter(Boolean).map((_, i) => `${marker}.shard${i}`)]) {
  fs.rmSync(path.join(OUT, `${name}.json`), { force: true });
}
await waitFor(`${base}/api/dev/echo-eval?op=status${q}`);
const openUrl = sharded ? gridUrl(base, q, shards) : runUrls[0];
if (!openBrowser(openUrl)) console.log('[echo-eval] could not open browser automatically; open the URL below manually');
console.log(`[echo-eval] open this: ${openUrl}`);
console.log(`[echo-eval] output ${OUT}`);
if (sharded) {
  console.log(`[echo-eval] fallback, one tab per shard instead of the grid:`);
  for (const url of runUrls) console.log(`  ${url}`);
}

const report = path.join(OUT, meetings ? 'meetings-report.md' : 'report.md');
for (;;) {
  await sleep(POLL_MS);
  const states = await Promise.all(
    shardQs.map(async (sq) => (await fetch(`${base}/api/dev/echo-eval?op=status${q}${sq}`)).json()),
  );
  console.log(`[echo-eval] ${states.map((s) => `${s.done}/${s.total}`).join('  ')}`);
  if (!sharded) {
    const [s] = states;
    if (s.error) {
      console.error(`[echo-eval] failed: ${s.error}`);
      stop(1);
    }
    if (s.finished) {
      console.log(`[echo-eval] report: ${report}`);
      stop(0);
    }
    continue;
  }
  if (!states.every((s) => s.finished || s.error)) continue;
  const failed = states.flatMap((s, i) => (s.error ? [i] : []));
  if (failed.length) {
    for (const i of failed) console.error(`[echo-eval] shard ${i} failed: ${states[i].error}\n  resume: ${runUrls[i]}`);
    console.error('[echo-eval] rerun the same command to resume the failed shards; finished shards keep their results');
    stop(1);
  }
  const merged = await fetch(`${base}/api/dev/echo-eval?op=merge${q}&shards=${shards}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!merged.ok) {
    console.error(`[echo-eval] merge failed: ${(await merged.text()).slice(0, 200)}`);
    stop(1);
  }
  console.log(`[echo-eval] merged ${shards} shards; report: ${report}`);
  stop(0);
}
