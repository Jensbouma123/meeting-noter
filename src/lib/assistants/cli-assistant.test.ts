import { describe, expect, it } from 'vitest';
import { connectAssistant, disconnectAssistant, listAssistants } from './index';
import { fakeDeps } from './test-deps';

const env = { NODE_ENV: 'test' as const, MEETING_NOTER_MCP_PATH: '/app/mcp.mjs', MEETING_NOTER_CLAUDE_DESKTOP_CONFIG: '/nonexistent/c.json' };

describe('CLI assistants', () => {
  it('returns a manual command when the CLI is missing', async () => {
    const list = await listAssistants(fakeDeps(env));
    expect(list.find((a) => a.id === 'claude-code')).toMatchObject({
      status: 'not-found',
      canAutoConnect: false,
      manualCommand: 'claude mcp add --scope user meeting-noter -- node /app/mcp.mjs',
    });
    expect(list.find((a) => a.id === 'codex')?.manualCommand).toBe('codex mcp add meeting-noter -- node /app/mcp.mjs');
    const res = await connectAssistant('codex', fakeDeps(env));
    expect(res).toMatchObject({ ok: false, error: 'cli-not-found', manualCommand: expect.stringContaining('codex mcp add') });
  });

  it('runs mcp add and mcp remove through the CLI', async () => {
    const calls: string[][] = [];
    const deps = fakeDeps(env, ['claude', 'codex'], async (bin, args) => {
      calls.push([bin, ...args]);
      return { ok: true, stdout: 'meeting-noter: node /app/mcp.mjs\n' };
    });
    expect(await connectAssistant('claude-code', deps)).toEqual({ ok: true, status: 'connected' });
    expect(await disconnectAssistant('codex', deps)).toEqual({ ok: true, status: 'not-connected' });
    expect(calls).toContainEqual(['/bin/claude', 'mcp', 'add', '--scope', 'user', 'meeting-noter', '--', 'node', '/app/mcp.mjs']);
    expect(calls).toContainEqual(['/bin/codex', 'mcp', 'remove', 'meeting-noter']);
    expect((await listAssistants(deps)).find((a) => a.id === 'codex')?.status).toBe('connected');
  });

  it('reports a failed CLI run', async () => {
    const deps = fakeDeps(env, ['claude'], async () => ({ ok: false, stdout: '' }));
    expect(await disconnectAssistant('claude-code', deps)).toEqual({ ok: false, error: 'cli-failed' });
  });
});
