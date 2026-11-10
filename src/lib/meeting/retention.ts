import { deleteSession, listSessions } from './session-store';

/** How long meetings are kept. `never` disables automatic deletion. */
export type RetentionChoice = '1y' | '2y' | '5y' | 'never';

export const DEFAULT_RETENTION: RetentionChoice = '2y';

export const RETENTION_OPTIONS: ReadonlyArray<{ value: RetentionChoice; label: string }> = [
  { value: '1y', label: '1 jaar' },
  { value: '2y', label: '2 jaar' },
  { value: '5y', label: '5 jaar' },
  { value: 'never', label: 'Nooit' },
];

export function isRetentionChoice(value: unknown): value is RetentionChoice {
  return value === '1y' || value === '2y' || value === '5y' || value === 'never';
}

/** Unknown or missing stored values fall back to the default. */
export function parseRetention(value: unknown): RetentionChoice {
  return isRetentionChoice(value) ? value : DEFAULT_RETENTION;
}

/**
 * Timestamp before which a meeting is expired, or null when nothing expires.
 * Calendar years (not 365-day blocks), so leap years do not shift the cutoff.
 */
export function retentionCutoff(choice: RetentionChoice, now: number): number | null {
  if (choice === 'never') return null;
  const years = choice === '1y' ? 1 : choice === '2y' ? 2 : 5;
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.getTime();
}

/** Ids of sessions strictly older than the cutoff; never the one being recorded. */
export function expiredSessionIds(
  sessions: ReadonlyArray<{ sessionId: string; createdAt: number }>,
  choice: RetentionChoice,
  now: number,
): string[] {
  const cutoff = retentionCutoff(choice, now);
  if (cutoff === null) return [];
  return sessions.filter((s) => s.createdAt < cutoff).map((s) => s.sessionId);
}

/**
 * Delete expired meetings with their transcript. Runs at app start; a meeting
 * being recorded is refused by deleteSession and so survives. Returns the
 * number removed. Never throws.
 */
export function purgeExpiredSessions(choice: RetentionChoice, now: number = Date.now()): number {
  let removed = 0;
  try {
    for (const id of expiredSessionIds(listSessions(), choice, now)) {
      if (deleteSession(id)) removed += 1;
    }
  } catch {
    // Cleanup is best-effort; the next start retries.
  }
  return removed;
}
