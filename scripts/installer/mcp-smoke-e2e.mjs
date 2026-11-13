#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

if (process.platform !== 'darwin') {
  console.log('mcp-smoke-e2e: skipped, package.sh builds on macOS only');
  process.exit(0);
}

const stage = process.env.MEETING_NOTER_STAGE ?? path.join(repo, 'build/installer/stage/meeting-noter');
const fresh = process.argv.includes('--build') || !existsSync(path.join(stage, 'server/server.js'));
if (fresh && process.env.MEETING_NOTER_STAGE) {
  console.error(`mcp-smoke-e2e: no staged app at ${stage}`);
  process.exit(1);
}
if (fresh) {
  const built = spawnSync('bash', ['scripts/installer/package.sh'], { cwd: repo, stdio: 'inherit' });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const test = spawnSync('npx', ['vitest', 'run', '--project', 'installer', 'scripts/installer/mcp-packaged.test.ts'], {
  cwd: repo,
  stdio: 'inherit',
  env: { ...process.env, MEETING_NOTER_STAGE: stage },
});
process.exit(test.status ?? 1);
