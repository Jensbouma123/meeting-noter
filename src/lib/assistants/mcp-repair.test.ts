import { describe, expect, it } from 'vitest';
import { connectAssistant, listAssistants } from './index';
import { fakeDeps } from './test-deps';

const env = { NODE_ENV: 'test' as const, MEETING_NOTER_MCP_PATH: '/app/mcp.mjs', MEETING_NOTER_CLAUDE_DESKTOP_CONFIG: '/nonexistent/c.json' };
const listed = async () => ({ ok: true, stdout: 'meeting-noter: node /app/mcp.mjs\n' });

describe('missing MCP bundle', () => {
  it('reports needs-repair instead of connected', async () => {
    const deps = fakeDeps(env, ['claude'], listed, { fileExists: () => false });
    expect((await listAssistants(deps)).find((a) => a.id === 'claude-code')?.status).toBe('needs-repair');
  });

  it('builds the bundle before registering', async () => {
    let built = false;
    const calls: string[][] = [];
    const deps = fakeDeps(
      env,
      ['claude'],
      async (_bin, args) => (calls.push(args), { ok: true, stdout: '' }),
      { fileExists: () => built, buildMcp: async () => (built = true) },
    );
    expect(await connectAssistant('claude-code', deps)).toEqual({ ok: true, status: 'connected' });
    expect(built).toBe(true);
    expect(calls.some((a) => a[1] === 'add')).toBe(true);
  });

  it('does not register when the build fails', async () => {
    const calls: string[][] = [];
    const deps = fakeDeps(env, ['claude'], async (_b, args) => (calls.push(args), { ok: true, stdout: '' }), {
      fileExists: () => false,
      buildMcp: async () => false,
    });
    expect(await connectAssistant('claude-code', deps)).toMatchObject({ ok: false, error: 'mcp-build-failed' });
    expect(calls).toEqual([]);
  });
});
