import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { PUT as putMeeting } from '../route';
import { GET as getMeeting } from '../route';
import { PUT as putInsights } from './route';
import { LOCAL, idContext, jsonRequest, rawRequest, registerTempDataDir } from '../../testHelpers';

registerTempDataDir('insights-route-');

const item = { id: 'decision:s2:0', kind: 'decision', text: 'We ship on Friday.', segmentId: 's2', speakerId: 'system:1', start: 40, score: 0.7 };
const set = { version: 2, items: [item], dismissed: ['action:s1:0'] };

describe('PUT /api/meetings/:id/insights', () => {
  it('refuses a foreign origin and a rebound host', async () => {
    const body = JSON.stringify(set);
    const origin = await putInsights(rawRequest('PUT', '/meeting-1/insights', { ...LOCAL, origin: 'https://evil.example' }, body), idContext('meeting-1'));
    const host = await putInsights(rawRequest('PUT', '/meeting-1/insights', { host: 'evil.example:3000' }, body), idContext('meeting-1'));
    expect([origin.status, host.status]).toEqual([403, 403]);
  });

  it('rejects a bad id and a malformed body', async () => {
    expect((await putInsights(jsonRequest('PUT', '/bad id/insights', set), idContext('bad id'))).status).toBe(400);
    expect((await putInsights(jsonRequest('PUT', '/meeting-1/insights', { items: 'x' }), idContext('meeting-1'))).status).toBe(400);
  });

  it('returns 404 for an unknown meeting', async () => {
    expect((await putInsights(jsonRequest('PUT', '/nope/insights', set), idContext('nope'))).status).toBe(404);
  });

  it('stores insights and a later client PUT without the field keeps them', async () => {
    const m = sampleMeeting();
    expect((await putMeeting(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id))).status).toBe(200);
    expect((await putInsights(jsonRequest('PUT', `/${m.id}/insights`, set), idContext(m.id))).status).toBe(200);
    const again = { ...m, updatedAt: m.updatedAt + 1, title: 'Renamed' };
    expect((await putMeeting(jsonRequest('PUT', `/${m.id}`, again), idContext(m.id))).status).toBe(200);
    const got = await (await getMeeting(new Request(`http://localhost:3000/api/meetings/${m.id}`, { headers: LOCAL }), idContext(m.id))).json();
    expect(JSON.stringify(got)).toContain('We ship on Friday.');
    expect(got.meeting?.title ?? got.title).toBe('Renamed');
  });
});
