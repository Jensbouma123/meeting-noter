import type { MeetingScore, PairScore, TurnScore } from '../types/meeting-score';
import type { Hit } from '../types/hit';
import { pct, wilson } from './stats';


const cell = (k: number, n: number): string => `${k}/${n} = ${n ? pct(wilson(k, n)) : 'n/a'}`;

export function rateTable<T>(rows: T[], groups: [string, Hit<T>][], metrics: [string, Hit<T>, Hit<T>][]): string {
  const head = ['| group | n |', ...metrics.map(([m]) => ` ${m} |`)].join('');
  const lines = [head, `|${'---|'.repeat(metrics.length + 2)}`];
  for (const [name, inGroup] of groups) {
    const sel = rows.filter(inGroup);
    const cells = metrics.map(([, denom, hit]) => {
      const d = sel.filter(denom);
      return ` ${cell(d.filter(hit).length, d.length)} |`;
    });
    lines.push(`| ${name} | ${sel.length} |${cells.join('')}`);
  }
  return lines.join('\n');
}

export const LANGS: [string, Hit<{ lang: string }>][] = [
  ['all', () => true],
  ['nl', (x) => x.lang === 'nl'],
  ['en', (x) => x.lang === 'en'],
  ['mixed', (x) => x.lang === 'mixed'],
];

const real = (t: TurnScore) => t.event !== 'backchannel';

export const turnMetrics: [string, Hit<TurnScore>, Hit<TurnScore>][] = [
  ['lost lines (heard, dropped)', (t) => real(t) && t.heard, (t) => t.lost],
  ['duplicate lines (remote, echo twin survived)', (t) => real(t) && t.role === 'remote' && t.heard, (t) => t.dups > 0],
  ['unheard by ASR', real, (t) => !t.heard],
];

export const meetingMetrics: [string, Hit<MeetingScore>, Hit<MeetingScore>][] = [
  ['speaker count exact', () => true, (m) => m.shownSpeakers === m.truthSpeakers],
  ['shown > truth (phantom)', () => true, (m) => m.shownSpeakers > m.truthSpeakers],
  ['has phantom speaker', () => true, (m) => m.phantomSpeakers > 0],
  ['has lost speaker', () => true, (m) => m.lostSpeakers > 0],
  ['has junk mic line', () => true, (m) => m.junkMicLines > 0],
];

export const pairMetrics: [string, Hit<PairScore>, Hit<PairScore>][] = [
  ['both kept', () => true, (p) => p.bothKept],
  ['merged', () => true, (p) => p.merged],
  ['echo-marked / lost', () => true, (p) => p.echoMarked],
];

export const PAIRINGS: [string, Hit<PairScore>][] = ['remote+remote', 'local+local', 'local+remote'].map(
  (n): [string, Hit<PairScore>] => [n, (p) => p.pairing === n],
);

export const OVERLAPS: [string, Hit<PairScore>][] = [
  ['10-40%', (p) => p.overlapFrac < 0.4],
  ['40-70%', (p) => p.overlapFrac >= 0.4 && p.overlapFrac < 0.7],
  ['70-100%', (p) => p.overlapFrac >= 0.7],
];

export const meanShown = (ms: MeetingScore[]): string =>
  ms.length ? `${(ms.reduce((s, m) => s + m.shownSpeakers - m.truthSpeakers, 0) / ms.length).toFixed(2)}` : 'n/a';
