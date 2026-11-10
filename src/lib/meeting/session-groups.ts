/** Pure helpers for the meeting list: day grouping and search. */

export interface GroupableSession {
  sessionId: string;
  title: string;
  createdAt: number;
}

export interface SessionGroup<T> {
  /** Stable key: `today`, `yesterday`, `d:YYYY-M-D` or `m:YYYY-M`. */
  key: string;
  label: string;
  sessions: T[];
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Sessions sorted newest first, grouped by local calendar day (this week) then month. */
export function groupSessionsByDay<T extends GroupableSession>(
  sessions: readonly T[],
  now: number = Date.now(),
  locale?: string,
): SessionGroup<T>[] {
  const nowDate = new Date(now);
  const today = startOfDay(nowDate);
  const yesterday = startOfDay(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1));
  const weekAgo = startOfDay(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 6));
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

  const groups: SessionGroup<T>[] = [];
  const byKey = new Map<string, SessionGroup<T>>();
  for (const s of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    const d = new Date(s.createdAt);
    const day = startOfDay(d);
    let key: string;
    let label: string;
    if (day >= today) {
      key = 'today';
      label = 'Vandaag';
    } else if (day >= yesterday) {
      key = 'yesterday';
      label = 'Gisteren';
    } else if (day >= weekAgo) {
      key = `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      label = dayFmt.format(d).replace(/\./g, '');
    } else {
      key = `m:${d.getFullYear()}-${d.getMonth()}`;
      label = monthFmt.format(d);
    }
    let g = byKey.get(key);
    if (!g) {
      g = { key, label, sessions: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.sessions.push(s);
  }
  return groups;
}

/**
 * Case-insensitive match on title or transcript text. `transcriptOf` is
 * called only for sessions whose title did not already match.
 */
export function filterSessions<T extends GroupableSession>(
  sessions: readonly T[],
  query: string,
  transcriptOf: (sessionId: string) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...sessions];
  return sessions.filter(
    (s) => s.title.toLowerCase().includes(q) || transcriptOf(s.sessionId).toLowerCase().includes(q),
  );
}
