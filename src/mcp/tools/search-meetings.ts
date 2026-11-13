import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { folderScope } from '../folder-scope';
import { toListItem } from '../meeting-list-item';
import { textResult } from '../tool-result';
import type { WithDb } from './types';

export function registerSearchMeetings(server: McpServer, withDb: WithDb): void {
  server.registerTool(
    'search_meetings',
    {
      title: 'Search meetings',
      description:
        'Full-text search over meeting titles, summaries (decisions and action items) and transcripts. ' +
        'Every word must match; words match as prefixes, case and accents are ignored. ' +
        'Returns the best matches with a snippet, hits in [brackets].',
      inputSchema: {
        query: z.string().min(1).describe('Words to look for, e.g. "budget freeze".'),
        limit: z.number().int().min(1).max(100).optional().describe('How many to return (default 10).'),
        folderId: z.string().min(1).optional().describe('Only meetings filed in this folder.'),
        includeSubfolders: z.boolean().optional().describe('Include meetings filed in descendant folders (requires folderId).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, limit, folderId, includeSubfolders }) =>
      withDb((db) => {
        const scope = folderScope(db, folderId, includeSubfolders);
        const hits = db.search(query, { limit: scope ? 100 : limit ?? 10 });
        const filtered = scope ? hits.filter((hit) => hit.folderId !== null && scope.has(hit.folderId)).slice(0, limit ?? 10) : hits;
        if (filtered.length === 0) return textResult(`No meetings match "${query}".`);
        return textResult(JSON.stringify(filtered.map((h) => ({ ...toListItem(h), snippet: h.snippet })), null, 2));
      }),
  );
}
