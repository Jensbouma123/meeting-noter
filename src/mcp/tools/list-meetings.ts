import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { folderScope } from '../folder-scope';
import { toListItem } from '../meeting-list-item';
import { textResult } from '../tool-result';
import type { WithDb } from './types';

export function registerListMeetings(server: McpServer, withDb: WithDb): void {
  server.registerTool(
    'list_meetings',
    {
      title: 'List meetings',
      description:
        'List recorded meetings (not empty drafts), newest first: id, title, date (ISO), duration, speakers and line count. ' +
        'Use get_meeting with an id to read one.',
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional().describe('How many to return (default 50).'),
        offset: z.number().int().min(0).optional().describe('How many of the newest to skip, for paging.'),
        folderId: z.string().min(1).optional().describe('Only meetings filed in this folder.'),
        includeSubfolders: z.boolean().optional().describe('Include meetings filed in descendant folders (requires folderId).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ limit, offset, folderId, includeSubfolders }) =>
      withDb((db) => {
        const scope = folderScope(db, folderId, includeSubfolders);
        const meetings = db.list({ limit: scope ? 1000 : limit ?? 50, offset: scope ? 0 : offset, includeDrafts: false });
        const filtered = scope ? meetings.filter((meeting) => meeting.folderId !== null && scope.has(meeting.folderId)) : meetings;
        return textResult(JSON.stringify((scope ? filtered.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50)) : filtered).map(toListItem), null, 2));
      }),
  );
}
