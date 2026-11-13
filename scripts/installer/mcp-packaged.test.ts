import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { desktopConfigPath, hasEntry, mergeEntry, readDesktopConfig, writeDesktopConfig } from '@/lib/assistants/desktop-config';
import { MCP_SERVER_NAME, mcpEntry } from '@/lib/assistants/mcp-entry';
import { MeetingsDb } from '@/lib/meeting-db/db';
import { connectStdio } from '@/mcp/test-client';
import { MCP_TOOLS } from './mcp-tools';

const stage = process.env.MEETING_NOTER_STAGE;
const serverDir = stage ? path.join(stage, 'server') : '';
const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'mn-mcp-smoke-'));
const realClaude = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
const env = { NODE_ENV: 'test' as const, MEETING_NOTER_CLAUDE_DESKTOP_CONFIG: path.join(tmp, 'Claude', 'claude_desktop_config.json') };

describe.skipIf(!stage)('packaged MCP server', () => {
  beforeAll(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(serverDir);
  });
  afterAll(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('resolves a script and node that exist in the built bundle', () => {
    const { command, args } = mcpEntry(env);
    expect(path.isAbsolute(command)).toBe(true);
    expect(fs.existsSync(command)).toBe(true);
    expect(fs.existsSync(args[0])).toBe(true);
    expect(path.resolve(args[0])).toBe(path.join(stage!, 'mcp', 'meetings-mcp.mjs'));
  });

  it('serves all five tools from the bundled node against a temp meetings.db', async () => {
    const db = path.join(tmp, 'meetings.db');
    new MeetingsDb(db).close();
    const { command, args } = mcpEntry(env);
    const client = await connectStdio(command, [...args, '--db', db]);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([...MCP_TOOLS].sort());
      const res = (await client.callTool({ name: 'list_meetings', arguments: {} })) as { isError?: boolean };
      expect(res.isError).not.toBe(true);
    } finally {
      await client.close();
    }
  });

  it('writes a working claude_desktop_config.json entry to a temp path only', () => {
    const file = desktopConfigPath(env);
    expect(file.startsWith(`${tmp}${path.sep}`)).toBe(true);
    expect(file.startsWith(realClaude)).toBe(false);
    writeDesktopConfig(file, mergeEntry({}, env), `${file}.bak`);
    const config = readDesktopConfig(file);
    expect(hasEntry(config)).toBe(true);
    const entry = config!.mcpServers![MCP_SERVER_NAME] as { command: string; args: string[] };
    expect(fs.existsSync(entry.command)).toBe(true);
    expect(fs.existsSync(entry.args[0])).toBe(true);
  });
});
