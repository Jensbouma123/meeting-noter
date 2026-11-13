import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MeetingsDb } from '../lib/meeting-db/db';
import { createMeetingsMcpServer } from './meetings-server';

const dirs: string[] = [];

export function removeTempDirs(): void {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}

export async function connectClient(server: McpServer): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientSide);
  return client;
}

export async function connect(seed?: (db: MeetingsDb) => void, active?: { meetingId: string | null; isLive: boolean }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-mcp-'));
  dirs.push(dir);
  const file = path.join(dir, 'meetings.db');
  if (seed) {
    const writer = new MeetingsDb(file);
    seed(writer);
    writer.close();
  }
  const activeFile = path.join(dir, 'active-meeting.json');
  if (active) fs.writeFileSync(activeFile, JSON.stringify(active));
  const server = createMeetingsMcpServer(() => (fs.existsSync(file) ? new MeetingsDb(file, { readOnly: true }) : null), '0.0.0', activeFile);
  const client = await connectClient(server);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { text: res.content[0].text, isError: res.isError === true };
  };
  return { client, call, file };
}

export async function connectStdio(command: string, args: string[]): Promise<Client> {
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command, args, stderr: 'ignore' }));
  return client;
}
