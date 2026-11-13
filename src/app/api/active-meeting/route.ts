import { activeMeetingPath } from '@/lib/active-meeting/file';
import { readActiveMeeting } from '@/lib/active-meeting/read';
import { writeActiveMeeting } from '@/lib/active-meeting/write';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { failure, readJson, storageFailure } from '@/lib/meeting-db/http';
import { meetingsDataDir } from '@/lib/meeting-db/paths';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1_000;

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  return Response.json(readActiveMeeting(activeMeetingPath(meetingsDataDir())));
}

export async function PUT(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const parsed = await readJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as { meetingId?: unknown; isLive?: unknown } | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('bad-body', 400);
  const { meetingId, isLive } = body;
  if (meetingId !== null && !isMeetingId(meetingId)) return failure('bad-meeting-id', 400);
  if (typeof isLive !== 'boolean') return failure('bad-is-live', 400);
  const value = { meetingId, isLive: meetingId === null ? false : isLive };
  try {
    writeActiveMeeting(activeMeetingPath(meetingsDataDir()), value);
    return Response.json(value);
  } catch (err) {
    return storageFailure(err);
  }
}
