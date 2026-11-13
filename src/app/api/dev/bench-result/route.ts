import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readJson } from '@/lib/meeting-db/http';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { benchResultsDir, disambiguate, resultFileName } from './helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1_000_000;
const MAX_FILENAME_ATTEMPTS = 100;

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const refused = refuseForeign(request);
  if (refused) return refused;
  const body = await readJson(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = body.value;
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return Response.json({ ok: false, error: 'body is not a JSON object' }, { status: 400 });
  }
  const payload = parsed as Record<string, unknown>;

  const dir = benchResultsDir();
  const name = resultFileName(payload);
  const receivedAt = new Date().toISOString();
  const serialize = (file: string) =>
    `${JSON.stringify({ ...payload, receivedAt, file }, null, 2)}\n`;

  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: `could not create ${dir}: ${errorMessage(err)}` },
      { status: 500 },
    );
  }

  let file = null;
  for (let nth = 0; nth < MAX_FILENAME_ATTEMPTS; nth++) {
    const candidate = nth === 0 ? name : disambiguate(name, nth);
    try {
      await writeFile(path.join(dir, candidate), serialize(candidate), { encoding: 'utf8', flag: 'wx' });
      file = path.join(dir, candidate);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') continue;
      return Response.json(
        { ok: false, error: `could not write ${dir}: ${errorMessage(err)}` },
        { status: 500 },
      );
    }
  }
  if (file === null) {
    return Response.json({ ok: false, error: `no free filename left for ${name}` }, { status: 500 });
  }

  return Response.json({ ok: true, file: path.basename(file) });
}
