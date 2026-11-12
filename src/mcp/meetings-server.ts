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
      if (!db) return text('Meeting database not found. Open Meeting Noter once to create it.');
      return fn(db);
    } catch (err) {
      // Details (which may name the local DB path) stay in stderr; the client gets generic text.
      console.error('[meeting-noter mcp] database error:', err instanceof Error ? err.message : String(err));
      return text('Could not read the meetings database. Open Meeting Noter once, then try again.', true);
    } finally {
      db?.close();
    }
  };

  const folderScope = (db: MeetingsDb, folderId?: string, includeSubfolders?: boolean): Set<string> | null => {
    if (folderId === undefined) return null;
    const folders = db.listFolders();
    const included = new Set([folderId]);
    if (includeSubfolders) {
      for (const folder of folders) {
        let parentId = folder.parentId;
        while (parentId !== null) {
          if (parentId === folderId) {
            included.add(folder.id);
            break;
          }
          parentId = folders.find((candidate) => candidate.id === parentId)?.parentId ?? null;
        }
      }
    }
    return included;
  };

  server.registerTool(
    'list_folders',
    {
      title: 'List folders',
      description: 'List meeting folders in hierarchy order with their id, name, parent id and full path.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      withDb((db) => {
        const folders = db.listFolders();
        const byId = new Map(folders.map((folder) => [folder.id, folder]));
        const depth = (folder: (typeof folders)[number]) => {
          let result = 0;
          let parentId = folder.parentId;
          while (parentId !== null) {
            const parent = byId.get(parentId);
            if (!parent) break;
            result += 1;
            parentId = parent.parentId;
          }
          return result;
        };
        const orderedFolders = [...folders].sort((a, b) => depth(a) - depth(b));
        return text(
          JSON.stringify(
            orderedFolders.map((folder) => {
              const parts = [folder.name];
              let parentId = folder.parentId;
              while (parentId !== null) {
                const parent = byId.get(parentId);
                if (!parent) break;
                parts.unshift(parent.name);
                parentId = parent.parentId;
              }
              return { id: folder.id, name: folder.name, parentId: folder.parentId, path: parts.join('/') };
            }),
            null,
            2,
          ),
        );
      }),
  );

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
        return text(JSON.stringify((scope ? filtered.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50)) : filtered).map(listItem), null, 2));
      }),
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
        if (filtered.length === 0) return text(`No meetings match "${query}".`);
        return text(JSON.stringify(filtered.map((h) => ({ ...listItem(h), snippet: h.snippet })), null, 2));
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
