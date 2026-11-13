import type { GroupableSession, SessionGroup } from './types/session-groups';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function groupSessionsByDay<T extends GroupableSession>(
  sessions: readonly T[],
  now: number = Date.now(),
  locale?: string,
  labels: { today: string; yesterday: string } = { today: 'Today', yesterday: 'Yesterday' },
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
      label = labels.today;
    } else if (day >= yesterday) {
      key = 'yesterday';
      label = labels.yesterday;
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
