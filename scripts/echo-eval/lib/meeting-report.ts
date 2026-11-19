import fs from 'node:fs';
import path from 'node:path';
import type { MeetingResult } from '../types/meeting-result';
import type { MeetingScore } from '../types/meeting-score';
import { buildMeetings } from './meeting-plan';
import { scoreMeeting } from './meeting-score';
import { LANGS, OVERLAPS, PAIRINGS, meanShown, meetingMetrics, pairMetrics, rateTable, turnMetrics } from './meeting-tables';
import type { Utterance } from '../types/utterance';

const readResults = (file: string): MeetingResult[] =>
  fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as MeetingResult);

function section(split: string, scores: MeetingScore[]): string[] {
  const turns = scores.flatMap((m) => m.turns);
  const pairs = scores.flatMap((m) => m.pairs);
  const out = [`\n## Split: ${split} (${scores.length} meetings, ${turns.length} real turns, ${pairs.length} crosstalk pairs)\n`];
  out.push('### Lines by turn language\n', rateTable(turns, LANGS, turnMetrics));
  out.push('\n### Speakers by meeting language\n', rateTable(scores, LANGS, meetingMetrics));
  out.push(`\nMean shown minus truth speakers: ${meanShown(scores)}; junk mic lines total ${scores.reduce((s, m) => s + m.junkMicLines, 0)}`);
  out.push('\n### Crosstalk by pairing (pair language)\n', rateTable(pairs, PAIRINGS, pairMetrics));
  out.push('\n### Crosstalk by overlap fraction\n', rateTable(pairs, OVERLAPS, pairMetrics));
  for (const lang of ['nl', 'en', 'mixed']) {
    out.push(`\n### Crosstalk, ${lang} pairs, by pairing\n`, rateTable(pairs.filter((p) => p.lang === lang), PAIRINGS, pairMetrics));
  }
  return out;
}

export function writeMeetingReport(outDir: string, resultsFile: string, utts: Utterance[]): void {
  if (!fs.existsSync(resultsFile)) return;
  const cases = new Map(buildMeetings(utts).map((c) => [c.id, c]));
  const scores = readResults(resultsFile).flatMap((r) => (cases.has(r.id) ? [scoreMeeting(cases.get(r.id)!, r)] : []));
  const md = [`# Meeting eval\n\nGenerated ${new Date().toISOString()}; ${scores.length} meetings. Attribution is by source column; merge: splitTranscript.\n`];
  for (const split of ['all', 'dev', 'heldout'] as const) {
    md.push(...section(split, scores.filter((m) => split === 'all' || m.split === split)));
  }
  fs.writeFileSync(path.join(outDir, 'meetings-report.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'meetings-scores.json'), JSON.stringify(scores, null, 2));
}
