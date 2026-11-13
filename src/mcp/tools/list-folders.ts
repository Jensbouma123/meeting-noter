import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult } from '../tool-result';
import type { WithDb } from './types';

export function registerListFolders(server: McpServer, withDb: WithDb): void {
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
        return textResult(
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
}
