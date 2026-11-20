import { describe, expect, it, vi } from 'vitest';
import { listAssistants } from './index';
import { readCliRegistration } from './cli-config';
import { fakeDeps, tempHome } from './test-deps';

// Fixtures are the files `claude|codex|agy mcp add` wrote in a scratch HOME.
const CLAUDE_USER = JSON.stringify({
  mcpServers: { 'meeting-noter': { type: 'stdio', command: 'node', args: ['/app/mcp.mjs'], env: {} } },
});
const CODEX = '[mcp_servers.other]\ncommand = "x"\n\n[mcp_servers.meeting-noter]\ncommand = "node"\nargs = ["/app/mcp.mjs"]\n';
const AGY = JSON.stringify({ mcpServers: { 'meeting-noter': { args: ['/app/mcp.mjs'], command: 'node', disabled: false } } });

function envFor(files: Record<string, string>) {
  return { NODE_ENV: 'test' as const, HOME: tempHome(files), MEETING_NOTER_MCP_PATH: '/app/mcp.mjs' };
}

describe('readCliRegistration', () => {
  it('reads user-scope Claude Code, Codex and agy config files', () => {
    const env = envFor({ '.claude.json': CLAUDE_USER, '.codex/config.toml': CODEX, '.gemini/config/mcp_config.json': AGY });
    expect(readCliRegistration('claude-code', env)).toBe(true);
    expect(readCliRegistration('codex', env)).toBe(true);
    expect(readCliRegistration('agy', env)).toBe(true);
  });

  it('finds a Claude Code local-scope entry for the server cwd only', () => {
    const projects = { '/work/app': { mcpServers: { 'meeting-noter': { command: 'node' } } } };
    const env = envFor({ '.claude.json': JSON.stringify({ mcpServers: {}, projects }) });
    expect(readCliRegistration('claude-code', env, '/work/app')).toBe(true);
    expect(readCliRegistration('claude-code', env, '/elsewhere')).toBe(false);
  });

  it('honours CLAUDE_CONFIG_DIR and CODEX_HOME and accepts a quoted TOML key', () => {
    const home = tempHome({ 'cfg/.claude.json': CLAUDE_USER, 'cx/config.toml': '[mcp_servers."meeting-noter"]\n' });
    const env = { HOME: '/nowhere', CLAUDE_CONFIG_DIR: `${home}/cfg`, CODEX_HOME: `${home}/cx` };
    expect(readCliRegistration('claude-code', env)).toBe(true);
    expect(readCliRegistration('codex', env)).toBe(true);
  });

  it('says not registered for a missing file, other servers or a disabled agy entry', () => {
    const disabled = JSON.stringify({ mcpServers: { 'meeting-noter': { command: 'node', disabled: true } } });
    const env = envFor({ '.codex/config.toml': '[mcp_servers.meeting-noter-old]\n', '.gemini/config/mcp_config.json': disabled });
    expect(readCliRegistration('claude-code', env)).toBe(false);
    expect(readCliRegistration('codex', env)).toBe(false);
    expect(readCliRegistration('agy', env)).toBe(false);
  });

  it('returns null for a file it cannot parse', () => {
    expect(readCliRegistration('claude-code', envFor({ '.claude.json': '{oops' }))).toBeNull();
  });
});

describe('listAssistants with config files', () => {
  it('reports connected CLIs without spawning mcp list', async () => {
    const runCli = vi.fn(async () => ({ ok: true, stdout: '' }));
    const env = envFor({ '.claude.json': CLAUDE_USER, '.codex/config.toml': CODEX });
    const list = await listAssistants(fakeDeps(env, ['claude', 'codex', 'agy'], runCli));
    expect(list.filter((a) => a.id === 'claude-code' || a.id === 'codex' || a.id === 'agy').map((a) => a.status)).toEqual([
      'connected',
      'connected',
      'not-connected',
    ]);
    expect(runCli).not.toHaveBeenCalled();
  });

  it('falls back to mcp list when the config cannot be parsed', async () => {
    const runCli = vi.fn(async () => ({ ok: true, stdout: 'meeting-noter: node /app/mcp.mjs - ✓ Connected\n' }));
    const list = await listAssistants(fakeDeps(envFor({ '.claude.json': '{oops' }), ['claude'], runCli));
    expect(list.find((a) => a.id === 'claude-code')?.status).toBe('connected');
    expect(runCli).toHaveBeenCalledWith('/bin/claude', ['mcp', 'list']);
  });
});
