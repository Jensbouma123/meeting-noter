import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { MeetingsDb } from '../lib/meeting-db/db';
import { renderMeetingMarkdown } from '../lib/meeting-db/markdown';
import type { MeetingSummaryRow } from '../lib/meeting-db/types';

/**
 * The meetings MCP server: three read-only tools over the app's meetings DB,
 * so an AI agent can find and read past meetings. `main.ts` runs it on stdio.
 * The DB is opened read-only, per call, so the server never holds a stale
 * handle and never blocks the app's writes; a missing DB reads as "no meetings".
 */

export const SERVER_NAME = 'meeting-noter';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: 'text', text: value }],
  ...(isError ? { isError } : {}),
});

function listItem(m: MeetingSummaryRow) {
  return {
    id: m.id,
    title: m.title,
    date: new Date(m.startedAt ?? m.createdAt).toISOString(),
    durationSeconds: m.durationSeconds,
    speakers: m.speakers,
    lines: m.segmentCount,
  };
}

/** `openDb` returns null when there is no DB yet. */
export function createMeetingsMcpServer(openDb: () => MeetingsDb | null, version = '0.0.0'): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version });

  const withDb = (fn: (db: MeetingsDb) => ToolResult): ToolResult => {
    let db: MeetingsDb | null = null;
    try {
      db = openDb();
      if (!db) return text('No meetings saved yet: Meeting Noter has not created its database.');
      return fn(db);
    } catch (err) {
      return text(`Could not read the meetings database: ${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
      db?.close();
    }
  };

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
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ limit, offset }) =>
      withDb((db) => text(JSON.stringify(db.list({ limit: limit ?? 50, offset, includeDrafts: false }).map(listItem), null, 2))),
  );

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
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, limit }) =>
      withDb((db) => {
        const hits = db.search(query, { limit: limit ?? 10 });
        if (hits.length === 0) return text(`No meetings match "${query}".`);
        return text(JSON.stringify(hits.map((h) => ({ ...listItem(h), snippet: h.snippet })), null, 2));
      }),
  );

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
        if (!meeting) return text(`No meeting with id "${id}".`, true);
        return text(format === 'json' ? JSON.stringify(meeting, null, 2) : renderMeetingMarkdown(meeting));
      }),
  );

  return server;
}
