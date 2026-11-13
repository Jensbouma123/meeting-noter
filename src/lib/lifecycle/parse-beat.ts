import type { Beat } from './types';

const CLIENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parseBeat(text: string): { clientId: string; beat: Beat } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const { clientId, recording, closing } = body as Record<string, unknown>;
  if (typeof clientId !== 'string' || !CLIENT_ID.test(clientId)) return null;
  return { clientId, beat: { recording: recording === true, closing: closing === true } };
}
