import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AssistantDeps, CliRunner } from './types';

export function tempDesktop(withApp = true): { dir: string; file: string; env: NodeJS.ProcessEnv } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assistants-'));
  const appDir = path.join(dir, 'Claude');
  if (withApp) fs.mkdirSync(appDir);
  const file = path.join(appDir, 'claude_desktop_config.json');
  return { dir, file, env: { NODE_ENV: 'test', MEETING_NOTER_CLAUDE_DESKTOP_CONFIG: file, MEETING_NOTER_MCP_PATH: '/app/mcp.mjs' } };
}

export function fakeDeps(env: NodeJS.ProcessEnv, bins: string[] = [], runCli?: CliRunner, extra: Partial<AssistantDeps> = {}): AssistantDeps {
  return {
    env,
    now: () => new Date('2026-01-02T03:04:05.678Z'),
    findCli: (name) => (bins.includes(name) ? `/bin/${name}` : null),
    runCli: runCli ?? (async () => ({ ok: true, stdout: '' })),
    fileExists: () => true,
    buildMcp: async () => true,
    ...extra,
  };
}
