import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listAssistants } from './index';
import { fakeDeps, tempDesktop, tempHome } from './test-deps';

const cleanupDirs: string[] = [];

afterEach(() => {
  cleanupDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

describe('listAssistants installed detection', () => {
  it('marks only on-disk .app bundles and PATH CLIs as installed without spawning CLIs', async () => {
    const home = tempHome();
    cleanupDirs.push(home);
    const existing = new Set<string>(['/Applications/Claude.app', path.join(home, 'Applications', 'Gemini.app')]);
    const runCli = vi.fn(async () => ({ ok: true, stdout: '' }));
    const deps = fakeDeps(
      {
        NODE_ENV: 'test',
        HOME: home,
        MEETING_NOTER_CLAUDE_DESKTOP_CONFIG: path.join(home, 'missing', 'claude_desktop_config.json'),
        MEETING_NOTER_MCP_PATH: '/app/mcp.mjs',
      },
      ['claude', 'agy'],
      runCli,
      { fileExists: (file) => existing.has(file) },
    );

    const list = await listAssistants(deps);
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));

    expect(byId['claude-desktop'].installed).toBe(true);
    expect(byId['claude-code'].installed).toBe(true);
    expect(byId['codex-app'].installed).toBe(false);
    expect(byId.codex.installed).toBe(false);
    expect(byId['gemini-app'].installed).toBe(true);
    expect(byId.agy.installed).toBe(true);
    expect(runCli).not.toHaveBeenCalled();
  });

  it('marks Claude Desktop as not installed when only leftover config dir exists without Claude.app', async () => {
    const desktop = tempDesktop(true);
    cleanupDirs.push(desktop.dir);
    fs.writeFileSync(desktop.file, JSON.stringify({ mcpServers: { 'meeting-noter': { command: 'node' } } }));
    const deps = fakeDeps(desktop.env, [], undefined, {
      fileExists: (file) => file === '/app/mcp.mjs',
    });

    const list = await listAssistants(deps);
    const claude = list.find((a) => a.id === 'claude-desktop');
    expect(claude?.status).toBe('connected');
    expect(claude?.installed).toBe(false);
  });
});
