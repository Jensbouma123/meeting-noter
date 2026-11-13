import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { PUT as putMeeting } from '../route';
import { PUT as decline } from './route';
import { meetingStore } from '@/lib/meeting-db/meeting-store';
import { LOCAL, idContext, jsonRequest, rawRequest, registerTempDataDir } from '../../testHelpers';

registerTempDataDir('folder-suggestion-route-');

const FOLDER = 'folder-1';

describe('PUT /api/meetings/:id/folder-suggestion', () => {
  it('refuses a foreign origin and a rebound host', async () => {
    const body = JSON.stringify({ folderId: FOLDER });
    const origin = await decline(rawRequest('PUT', '/meeting-1/folder-suggestion', { ...LOCAL, origin: 'https://evil.example' }, body), idContext('meeting-1'));
    const host = await decline(rawRequest('PUT', '/meeting-1/folder-suggestion', { host: 'evil.example:3000' }, body), idContext('meeting-1'));
    expect([origin.status, host.status]).toEqual([403, 403]);
  });

  it('rejects bad ids and returns 404 for an unknown meeting', async () => {
    expect((await decline(jsonRequest('PUT', '/bad id/folder-suggestion', { folderId: FOLDER }), idContext('bad id'))).status).toBe(400);
    expect((await decline(jsonRequest('PUT', '/meeting-1/folder-suggestion', { folderId: 'bad id' }), idContext('meeting-1'))).status).toBe(400);
    expect((await decline(jsonRequest('PUT', '/meeting-1/folder-suggestion', {}), idContext('meeting-1'))).status).toBe(400);
    expect((await decline(jsonRequest('PUT', '/nope/folder-suggestion', { folderId: FOLDER }), idContext('nope'))).status).toBe(404);
  });

  it('persists the decline and a later client PUT keeps it', async () => {
    const m = sampleMeeting();
    expect((await putMeeting(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id))).status).toBe(200);
    expect((await decline(jsonRequest('PUT', `/${m.id}/folder-suggestion`, { folderId: FOLDER }), idContext(m.id))).status).toBe(200);
    const again = { ...m, updatedAt: m.updatedAt + 1, title: 'Renamed' };
    expect((await putMeeting(jsonRequest('PUT', `/${m.id}`, again), idContext(m.id))).status).toBe(200);
    expect(meetingStore().db.list()[0].folderSuggestionDeclined).toEqual([FOLDER]);
  });
});
