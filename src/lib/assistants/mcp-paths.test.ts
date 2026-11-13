import { describe, expect, it } from 'vitest';
import { ensureMcpBundle, mcpEntry } from './mcp-entry';
import { mcpScriptPath } from './mcp-paths';

const cwd = '/Apps/Meeting Noter/app/server';
const packaged = '/Apps/Meeting Noter/app/mcp/meetings-mcp.mjs';
const bundledNode = '/Apps/Meeting Noter/app/node/bin/node';
const noEnv = {} as NodeJS.ProcessEnv;
const probe = (...files: string[]) => (f: string) => files.includes(f);

describe('MCP path resolution', () => {
  it('prefers the packaged script next to the server dir', () => {
    const exists = probe(packaged, `${cwd}/build/mcp/meetings-mcp.mjs`);
    expect(mcpScriptPath(noEnv, { cwd, exists })).toBe(packaged);
  });

  it('falls back to the dev build path', () => {
    const dev = '/repo/build/mcp/meetings-mcp.mjs';
    expect(mcpScriptPath(noEnv, { cwd: '/repo', exists: probe(dev) })).toBe(dev);
    expect(mcpScriptPath(noEnv, { cwd: '/repo', exists: probe() })).toBe(dev);
  });

  it('points at the packaged script when the bundled node exists but the script is missing', () => {
    expect(mcpScriptPath(noEnv, { cwd, exists: probe(bundledNode) })).toBe(packaged);
  });

  it('honours the env override', () => {
    expect(mcpScriptPath({ NODE_ENV: 'test', MEETING_NOTER_MCP_PATH: '/x.mjs' }, { cwd, exists: probe(packaged) })).toBe('/x.mjs');
  });

  it('uses the bundled node when present, else node on PATH', () => {
    expect(mcpEntry(noEnv, { cwd, exists: probe(packaged, bundledNode) })).toEqual({ command: bundledNode, args: [packaged] });
    expect(mcpEntry(noEnv, { cwd: '/repo', exists: probe() }).command).toBe('node');
  });
});

describe('ensureMcpBundle', () => {
  const attempt = async (dir: string, files: string[], buildCreates?: string) => {
    const present = new Set(files);
    let built = 0;
    const deps = {
      env: noEnv,
      fileExists: (f: string) => present.has(f),
      buildMcp: async () => (built++, buildCreates && present.add(buildCreates), true),
    };
    return { ok: await ensureMcpBundle(deps, dir), built };
  };

  it('packaged app with the script present needs no build', async () => {
    expect(await attempt(cwd, [packaged, bundledNode])).toEqual({ ok: true, built: 0 });
  });

  it('packaged app with the script missing fails without building', async () => {
    expect(await attempt(cwd, [bundledNode])).toEqual({ ok: false, built: 0 });
  });

  it('dev checkout builds a missing script', async () => {
    expect(await attempt('/repo', [], '/repo/build/mcp/meetings-mcp.mjs')).toEqual({ ok: true, built: 1 });
  });
});
