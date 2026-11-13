import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { markdownFileName } from '@/lib/meeting-db/markdown';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { DELETE as remove, GET as get, PUT as put } from './[id]/route';
import { LOCAL, dataDirFiles, idContext, rawRequest, registerTempDataDir } from './testHelpers';

const data = registerTempDataDir('meetings-guards-');

describe('meeting ids never reach a path', () => {
  const bad = ['..', '../x', '..%2Fx', 'a/b', 'a\\b', '/etc/passwd', 'C:\\x', 'a\0b', 'a b', '.', '', 'x'.repeat(101), 'é'];
  it.each(bad)('GET and DELETE answer 400 for %j', async (id) => {
    expect((await get(rawRequest('GET', '/x', LOCAL), idContext(id))).status).toBe(400);
    expect((await remove(rawRequest('DELETE', '/x', LOCAL), idContext(id))).status).toBe(400);
  });

  it.each(bad.filter((id) => id !== ''))('PUT refuses id %j even when the body carries the same id', async (id) => {
    const res = await put(
      rawRequest('PUT', '/x', { ...LOCAL, 'content-type': 'application/json' }, JSON.stringify(sampleMeeting({ id }))),
      idContext(id),
    );
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(data.dir, 'meetings'))).toBe(false);
  });

  it('a hostile title cannot move the Markdown file out of meetings/', async () => {
    const title = '../../../../etc/passwd\0/..\\..\\evil';
    const m = sampleMeeting({ title });
    expect(markdownFileName(m)).toMatch(/^[a-z0-9-]+\.md$/);
    const res = await put(
      rawRequest('PUT', `/${m.id}`, { ...LOCAL, 'content-type': 'application/json' }, JSON.stringify(m)),
      idContext(m.id),
    );
    expect(res.status).toBe(200);
    expect(fs.readdirSync(path.join(data.dir, 'meetings'))).toHaveLength(1);
    expect(dataDirFiles(data.dir).sort()).toEqual(['meetings']);
  });
});
