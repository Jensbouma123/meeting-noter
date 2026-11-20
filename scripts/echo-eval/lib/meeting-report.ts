import fs from 'node:fs';
import path from 'node:path';
import type { MeetingCase } from '../types/meeting-case';
import type { MeetingScore, ScoredMeetingResult } from '../types/meeting-score';
import { scoreMeeting } from './meeting-score';
import {
  LANGS,
  OVERLAPS,
  PAIRINGS,
  TURN_LANGS,
  TURN_OVERLAPS,
  TURN_PAIRINGS,
  diarMeetingMetrics,
  diarPairMetrics,
  diarTurnMetrics,
  meanShown,
  meetingMetrics,
  pairMetrics,
  rateTable,
  speakerMetrics,
  speakerTotals,
  turnMetrics,
} from './meeting-tables';

const readResults = (file: string): ScoredMeetingResult[] =>
  fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as ScoredMeetingResult);

function section(split: string, scores: MeetingScore[], labeled: boolean): string[] {
  const turns = scores.flatMap((m) => m.turns);
  const pairs = scores.flatMap((m) => m.pairs);
  const speakers = scores.flatMap((m) => m.speakers);
  const tMetrics = labeled ? diarTurnMetrics : turnMetrics;
  const pMetrics = labeled ? diarPairMetrics : pairMetrics;
  const mMetrics = labeled ? diarMeetingMetrics : meetingMetrics;
  const out = [`\n## Split: ${split} (${scores.length} meetings, ${turns.length} real turns, ${pairs.length} crosstalk pairs)\n`];
  out.push('### Lines by turn language\n', rateTable(turns, labeled ? TURN_LANGS : LANGS, tMetrics));
  if (labeled) {
    out.push('\n### Lines by pairing\n', rateTable(turns, TURN_PAIRINGS, tMetrics));
    out.push('\n### Lines by overlap fraction\n', rateTable(turns.filter((t) => t.overlapFrac !== null), TURN_OVERLAPS, tMetrics));
    out.push('\n### Per-speaker attribution by language\n', rateTable(speakers, TURN_LANGS, speakerMetrics));
  }
  out.push('\n### Speakers by meeting language\n', rateTable(scores, LANGS, mMetrics));
  out.push(
    labeled
      ? `\nMean shown minus truth speakers: ${meanShown(scores)}; ${speakerTotals(scores)}`
      : `\nMean shown minus truth speakers: ${meanShown(scores)}; junk mic lines total ${scores.reduce((s, m) => s + m.junkMicLines, 0)}`,
  );
  out.push('\n### Crosstalk by pairing (pair language)\n', rateTable(pairs, PAIRINGS, pMetrics));
  out.push('\n### Crosstalk by overlap fraction\n', rateTable(pairs, OVERLAPS, pMetrics));
  for (const lang of ['nl', 'en', 'mixed']) {
    out.push(`\n### Crosstalk, ${lang} pairs, by pairing\n`, rateTable(pairs.filter((p) => p.lang === lang), PAIRINGS, pMetrics));
  }
  return out;
}

export function formatMeetingReport(scores: MeetingScore[], now = new Date().toISOString()): string {
  const labeled = scores.some((m) => m.labeled);
  const allLabeled = labeled && scores.every((m) => m.labeled);
  const mode = allLabeled
    ? 'diarization label (optimal 1-to-1 overlap assignment)'
    : labeled
      ? 'mixed (diarization label where present, else source column)'
      : 'source column';
  const md = [`# Meeting eval\n\nGenerated ${now}; ${scores.length} meetings. Attribution is by ${mode}; merge: splitTranscript.\n`];
  for (const split of ['all', 'dev', 'heldout'] as const) {
    md.push(...section(split, scores.filter((m) => split === 'all' || m.split === split), labeled));
  }
  return md.join('\n') + '\n';
}

export function writeMeetingReport(outDir: string, resultsFile: string, meetings: MeetingCase[], name = 'meetings'): void {
  if (!fs.existsSync(resultsFile)) return;
  const cases = new Map(meetings.map((c) => [c.id, c]));
  const scores = readResults(resultsFile).flatMap((r) => (cases.has(r.id) ? [scoreMeeting(cases.get(r.id)!, r)] : []));
  fs.writeFileSync(path.join(outDir, `${name}-report.md`), formatMeetingReport(scores));
  fs.writeFileSync(path.join(outDir, `${name}-scores.json`), JSON.stringify(scores, null, 2));
}
