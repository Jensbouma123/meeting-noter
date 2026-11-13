import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_MEETING_BODY_BYTES } from '@/lib/meeting-db/http';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { GET as list } from './route';
import { PUT as put } from './[id]/route';
import { POST as importMeetings } from './import/route';
import { LOCAL, dataDirFiles, env, idContext, meetingsUrl, rawRequest, useTempDataDir } from './testHelpers';

const data = useTempDataDir('meetings-guards-');

describe('body checks', () => {
  const putMeetingBody = (headers: Record<string, string>, body: string) => {
    const m = sampleMeeting();
    return put(rawRequest('PUT', `/${m.id}`, { ...LOCAL, ...headers }, body), idContext(m.id));
  };
  it('rejects a declared oversize body with 413', async () => {
    expect((await putMeetingBody({ 'content-length': String(MAX_MEETING_BODY_BYTES + 1) }, '{}')).status).toBe(413);
  });

  it('rejects a chunked oversize body with 413 while streaming it', async () => {
    const m = sampleMeeting();
    const chunk = 'x'.repeat(1_000_000);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode(chunk));
      },
    });
    const res = await put(
      new Request(meetingsUrl(`/${m.id}`), {
        method: 'PUT',
        headers: { ...LOCAL, 'content-type': 'application/json' },
        body,
        duplex: 'half',
      } as RequestInit),
      idContext(m.id),
    );
    expect(res.status).toBe(413);
    expect(dataDirFiles(data.dir)).toEqual([]);
  });

  it('rejects malformed JSON and non-objects with 400', async () => {
    expect((await putMeetingBody({}, '{not json')).status).toBe(400);
    expect((await putMeetingBody({}, 'null')).status).toBe(400);
    expect((await putMeetingBody({}, '[]')).status).toBe(400);
    expect((await putMeetingBody({}, JSON.stringify({ id: 'meeting-1' }))).status).toBe(400);
  });

  it('import refuses a non-array, malformed JSON and an oversize declared body', async () => {
    const post = (headers: Record<string, string>, body: string) =>
      importMeetings(rawRequest('POST', '/import', { ...LOCAL, ...headers }, body));
    expect((await post({}, JSON.stringify({ meetings: 'x' }))).status).toBe(400);
    expect((await post({}, 'nope')).status).toBe(400);
    expect((await post({}, JSON.stringify([]))).status).toBe(400);
    expect((await post({ 'content-length': '200000001' }, JSON.stringify({ meetings: [] }))).status).toBe(413);
  });

  it('import counts hostile ids as invalid and writes nothing for them', async () => {
    const good = sampleMeeting();
    const res = await importMeetings(
      rawRequest('POST', '/import', LOCAL, JSON.stringify({ meetings: [{ ...good, id: '../evil' }, { ...good, id: 'a/b' }, good] })),
    );
    expect(await res.json()).toMatchObject({ imported: 1, invalid: 2 });
    expect(fs.readdirSync(path.join(data.dir, 'meetings'))).toHaveLength(1);
  });

  it('storage errors do not leak the data dir path in the message', async () => {
    env.MEETING_NOTER_DATA_DIR = path.join(data.dir, 'file-not-dir', 'x');
    fs.writeFileSync(path.join(data.dir, 'file-not-dir'), '');
    const res = await list(rawRequest('GET', '', LOCAL));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'storage-unavailable' });
  });
});
