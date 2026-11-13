import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { renderMeetingMarkdown } from '../../lib/meeting-db/markdown';
import { textResult } from '../tool-result';
import type { WithDb } from './types';

export function registerGetMeeting(server: McpServer, withDb: WithDb): void {
  server.registerTool(
    'get_meeting',
    {
      title: 'Get meeting',
      description:
        'Read one meeting by id: title, date, speakers, summary and the full transcript with timestamps. ' +
        'format "markdown" (default) is easiest to read; "json" gives the raw lines, speakers and notes.',
      inputSchema: {
        id: z.string().min(1).describe('Meeting id from list_meetings or search_meetings.'),
        format: z.enum(['markdown', 'json']).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ id, format }) =>
      withDb((db) => {
        const meeting = db.get(id);
        if (!meeting) return textResult(`No meeting with id "${id}".`, true);
        return textResult(format === 'json' ? JSON.stringify(meeting, null, 2) : renderMeetingMarkdown(meeting));
      }),
  );
}
