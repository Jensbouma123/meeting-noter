import fs from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MeetingsDb } from '../lib/meeting-db/db';
import { meetingsDbPath } from '../lib/meeting-db/paths';
import { createMeetingsMcpServer } from './meetings-server';

declare const MEETING_NOTER_VERSION: string | undefined;

function dbPathFromArgs(argv: string[]): string {
  const i = argv.indexOf('--db');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : meetingsDbPath();
}

const file = dbPathFromArgs(process.argv.slice(2));
const version = typeof MEETING_NOTER_VERSION === 'string' ? MEETING_NOTER_VERSION : '0.0.0';
const server = createMeetingsMcpServer(() => (fs.existsSync(file) ? new MeetingsDb(file, { readOnly: true }) : null), version);

server.connect(new StdioServerTransport()).then(
  () => console.error(`[meeting-noter mcp] reading ${file}`),
  (err) => {
    console.error('[meeting-noter mcp] failed to start', err);
    process.exit(1);
  },
);
