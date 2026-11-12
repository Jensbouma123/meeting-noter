import fs from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MeetingsDb } from '../lib/meeting-db/db';
import { meetingsDbPath } from '../lib/meeting-db/paths';
import { createMeetingsMcpServer } from './meetings-server';

/**
 * Entry point of the meetings MCP server (stdio). Bundled to one file by
 * `npm run mcp:build` (and by package.sh into the installed app), so it runs
 * with plain `node`, no node_modules: see docs/MCP.md for the client config.
 * `--db <file>` or MEETING_NOTER_DATA_DIR point it at another database.
 */

declare const MEETING_NOTER_VERSION: string | undefined;

function dbPathFromArgs(argv: string[]): string {
  const i = argv.indexOf('--db');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : meetingsDbPath();
}

const file = dbPathFromArgs(process.argv.slice(2));
const version = typeof MEETING_NOTER_VERSION === 'string' ? MEETING_NOTER_VERSION : '0.0.0';
const server = createMeetingsMcpServer(() => (fs.existsSync(file) ? new MeetingsDb(file, { readOnly: true }) : null), version);

// stdout carries the protocol: anything else goes to stderr.
server.connect(new StdioServerTransport()).then(
  () => console.error(`[meeting-noter mcp] reading ${file}`),
  (err) => {
    console.error('[meeting-noter mcp] failed to start', err);
    process.exit(1);
  },
);
