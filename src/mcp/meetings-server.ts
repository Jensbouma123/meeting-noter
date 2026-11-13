import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MeetingsDb } from '../lib/meeting-db/db';
import { SERVER_NAME } from './constants';
import { registerGetActiveMeeting } from './tools/get-active-meeting';
import { registerGetMeeting } from './tools/get-meeting';
import { registerListFolders } from './tools/list-folders';
import { registerListMeetings } from './tools/list-meetings';
import { registerSearchMeetings } from './tools/search-meetings';
import { createWithDb } from './with-db';

export function createMeetingsMcpServer(openDb: () => MeetingsDb | null, version = '0.0.0', activeMeetingFile = ''): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version });
  const withDb = createWithDb(openDb);
  registerListFolders(server, withDb);
  registerListMeetings(server, withDb);
  registerSearchMeetings(server, withDb);
  registerGetMeeting(server, withDb);
  registerGetActiveMeeting(server, withDb, activeMeetingFile);
  return server;
}
