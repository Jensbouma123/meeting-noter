import type { Speaker } from './types';
import type { AutosaveInput, AutosavedSession } from './types/autosave';

export const AUTOSAVE_VERSION = 1;

export function sanitizeSnapshot(input: AutosaveInput): AutosavedSession | null {
  try {
    if (!input || typeof input.sessionId !== 'string' || input.sessionId.length === 0) return null;
    const rawSegments = Array.isArray(input.segments) ? input.segments : [];
    const segments = rawSegments
      .filter((s) => s && s.final === true && typeof s.text === 'string')
      .map((s) => (s.words ? { ...s, words: undefined } : s));
    const speakers: Record<string, Speaker> =
      input.speakers && typeof input.speakers === 'object' ? input.speakers : {};
    return {
      version: AUTOSAVE_VERSION,
      savedAt: Date.now(),
      sessionId: input.sessionId,
      title: typeof input.title === 'string' ? input.title : 'Untitled meeting',
      segments,
      speakers,
      startedAt: typeof input.startedAt === 'number' ? input.startedAt : null,
    };
  } catch {
    return null;
  }
}
