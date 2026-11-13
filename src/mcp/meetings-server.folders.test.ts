import { afterEach, describe, expect, it } from 'vitest';
import { sampleMeeting } from '../lib/meeting-db/test-meeting';
import { connect, removeTempDirs } from './test-client';

afterEach(removeTempDirs);

describe('meetings MCP server folders', () => {
  it('offers the read-only meeting and folder tools', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_active_meeting', 'get_meeting','list_folders', 'list_meetings', 'search_meetings']);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it('lists folders with their hierarchy and paths', async () => {
    const { call } = await connect((db) => {
      const parent = db.createFolder('Planning', null, undefined, '10000000-0000-4000-8000-000000000001');
      db.createFolder('2026', parent.id, undefined, '10000000-0000-4000-8000-000000000002');
    });
    const folders = JSON.parse((await call('list_folders')).text);
    expect(folders).toEqual([
      { id: '10000000-0000-4000-8000-000000000001', name: 'Planning', parentId: null, path: 'Planning' },
      { id: '10000000-0000-4000-8000-000000000002', name: '2026', parentId: '10000000-0000-4000-8000-000000000001', path: 'Planning/2026' },
    ]);
  });

  it('filters list and search by folder, optionally including descendants', async () => {
    const { call } = await connect((db) => {
      const parent = db.createFolder('Planning', null, undefined, '20000000-0000-4000-8000-000000000001');
      const child = db.createFolder('2026', parent.id, undefined, '20000000-0000-4000-8000-000000000002');
      db.upsert(sampleMeeting({ id: 'parent-meeting', title: 'Budget parent', folderId: parent.id }));
      db.upsert(sampleMeeting({ id: 'child-meeting', title: 'Budget child', folderId: child.id }));
      db.upsert(sampleMeeting({ id: 'unfiled-meeting', title: 'Budget unfiled' }));
    });
    const direct = JSON.parse((await call('list_meetings', { folderId: '20000000-0000-4000-8000-000000000001' })).text);
    expect(direct.map((m: { id: string }) => m.id)).toEqual(['parent-meeting']);
    const nested = JSON.parse((await call('list_meetings', { folderId: '20000000-0000-4000-8000-000000000001', includeSubfolders: true })).text);
    expect(nested.map((m: { id: string }) => m.id).sort()).toEqual(['child-meeting', 'parent-meeting']);
    const hits = JSON.parse((await call('search_meetings', { query: 'budget', folderId: '20000000-0000-4000-8000-000000000001', includeSubfolders: true })).text);
    expect(hits.map((m: { id: string }) => m.id).sort()).toEqual(['child-meeting', 'parent-meeting']);
  });
});
