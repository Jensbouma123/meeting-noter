import { describe, expect, it, vi } from 'vitest';
import { filterSessions, groupSessionsByDay } from './session-groups';

const s = (id: string, at: Date, title = id) => ({ sessionId: id, title, createdAt: at.getTime() });
// Tuesday 10 Nov 2026, 00:30 local: yesterday's evening is close by.
const NL = { today: 'Vandaag', yesterday: 'Gisteren' };
const NOW = new Date(2026, 10, 10, 0, 30).getTime();

describe('groupSessionsByDay', () => {
  it('splits today/yesterday exactly at local midnight', () => {
    const g = groupSessionsByDay(
      [
        s('a', new Date(2026, 10, 10, 0, 0, 0)),
        s('b', new Date(2026, 10, 9, 23, 59, 59, 999)),
        s('c', new Date(2026, 10, 9, 0, 0, 0)),
        s('d', new Date(2026, 10, 8, 23, 59)),
      ],
      NOW,
      'nl',
      NL,
    );
    expect(g.map((x) => [x.label, x.sessions.map((y) => y.sessionId)])).toEqual([
      ['Vandaag', ['a']],
      ['Gisteren', ['b', 'c']],
      [expect.stringMatching(/zo.*8/), ['d']],
    ]);
  });

  it('uses weekday+date within a week and months beyond', () => {
    const g = groupSessionsByDay(
      [s('w', new Date(2026, 10, 4, 12)), s('o1', new Date(2026, 9, 20)), s('o2', new Date(2026, 9, 2)), s('y', new Date(2025, 9, 2))],
      NOW,
      'nl',
    );
    expect(g.map((x) => x.key)).toEqual(['d:2026-10-4', 'm:2026-9', 'm:2025-9']);
    expect(g[0].label).toMatch(/wo.*4.*nov/);
    expect(g[1].sessions).toHaveLength(2);
    expect(g[1].label).toBe('oktober 2026');
  });

  it('follows the process timezone, not UTC', () => {
    // 23:30 local on the 9th may be the 10th in UTC; it must still be yesterday.
    const g = groupSessionsByDay([s('x', new Date(2026, 10, 9, 23, 30))], NOW, 'nl', NL);
    expect(g[0].label).toBe('Gisteren');
  });

  it('labels today/yesterday in English by default', () => {
    const g = groupSessionsByDay([s('a', new Date(2026, 10, 10, 0, 5)), s('b', new Date(2026, 10, 9, 12))], NOW);
    expect(g.map((x) => x.label)).toEqual(['Today', 'Yesterday']);
  });

  it('sorts newest first and returns nothing for no sessions', () => {
    const g = groupSessionsByDay([s('old', new Date(2026, 10, 9, 8)), s('new', new Date(2026, 10, 9, 20))], NOW);
    expect(g[0].sessions.map((x) => x.sessionId)).toEqual(['new', 'old']);
    expect(groupSessionsByDay([], NOW)).toEqual([]);
  });
});

describe('filterSessions', () => {
  const list = [s('1', new Date(), 'Budget review'), s('2', new Date(), 'Standup'), s('3', new Date(), 'Darten')];
  const texts: Record<string, string> = { '1': '', '2': 'we spraken over de Begroting', '3': '' };

  it('matches title and transcript, case-insensitively', () => {
    const t = (id: string) => texts[id];
    expect(filterSessions(list, 'BUDGET', t).map((x) => x.sessionId)).toEqual(['1']);
    expect(filterSessions(list, 'begroting', t).map((x) => x.sessionId)).toEqual(['2']);
    expect(filterSessions(list, 'zzz', t)).toEqual([]);
  });

  it('empty query returns all without reading transcripts; title hit skips transcript', () => {
    const t = vi.fn(() => '');
    expect(filterSessions(list, '  ', t)).toHaveLength(3);
    expect(t).not.toHaveBeenCalled();
    filterSessions(list, 'standup', t);
    expect(t).toHaveBeenCalledTimes(2); // not for the matching title
  });
});
