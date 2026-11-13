// @vitest-environment jsdom
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { describe, expect, it } from 'vitest';
import { harness, line, loadSync, setupServerSyncTest } from './server-sync.testUtils';

setupServerSyncTest();

describe('end to end: the app saves, the MCP server finds it', () => {
  it('a meeting saved through the session store is returned by search_meetings over stdio', async () => {
    const root = path.resolve(__dirname, '../../..');
    const bundle = path.join(harness.dir, 'meetings-mcp.mjs');
    execFileSync(process.execPath, [path.join(root, 'node_modules/rolldown/bin/cli.mjs'), '-c', 'scripts/mcp/rolldown.config.mjs'], {
      cwd: root,
      env: { ...process.env, MCP_OUT: bundle },
      stdio: 'ignore',
    });

    const sync = await loadSync();
    await sync.startServerSync();
    const { persistSession } = await import('./session-store');
    const { addAction } = await import('./notes');
    const id = persistSession({
      title: 'Supplier call',
      segments: [line('s1', 'The invoice for the zeppelin parts is late again', 3)],
      speakers: { 'mic:0': { id: 'mic:0', source: 'mic', label: 'Sanne', colorIndex: 0 } },
      startedAt: Date.UTC(2026, 10, 12, 9),
    });
    addAction(id, 'Chase the invoice', { ownerName: 'Sanne' });
    await sync.flushServerSync();

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [bundle],
      env: { MEETING_NOTER_DATA_DIR: harness.dir },
      stderr: 'ignore',
    });
    const client = new Client({ name: 'e2e', version: '1.0.0' });
    await client.connect(transport);
    try {
      const res = (await client.callTool({ name: 'search_meetings', arguments: { query: 'zeppelin invoice' } })) as {
        content: { text: string }[];
      };
      const hits = JSON.parse(res.content[0].text);
      expect(hits.map((h: { id: string }) => h.id)).toEqual([id]);
      expect(hits[0]).toMatchObject({ title: 'Supplier call', speakers: ['Sanne'] });
      const md = (await client.callTool({ name: 'get_meeting', arguments: { id } })) as { content: { text: string }[] };
      expect(md.content[0].text).toContain('- [ ] Chase the invoice (Sanne)');
      expect(md.content[0].text).toContain('[00:03] Sanne: The invoice for the zeppelin parts is late again');
    } finally {
      await client.close();
    }
  }, 30_000);
});
