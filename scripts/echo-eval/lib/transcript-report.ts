import type { HypSegment } from '../types/hyp-segment';
import type { MeetingCase, MeetingEvent } from '../types/meeting-case';
import type { MeetingScore, ScoredMeetingResult } from '../types/meeting-score';
import type { RefTurn } from '../types/ref-turn';
import { diarizationError } from './der';
import { isOverSplit, turnLines } from './oversplit';
import { corpusWer, speakerWer } from './wer';

const EVENTS: MeetingEvent[] = ['turn', 'interrupt', 'backchannel'];
const pc = (x: number): string => `${(x * 100).toFixed(1)}%`;
const sourceOf = (role: 'local' | 'remote'): 'mic' | 'system' => (role === 'remote' ? 'system' : 'mic');

export const hasReference = (c: MeetingCase): boolean => c.turns.some((t) => typeof t.refText === 'string');

/**
 * Reference turns and kept app lines of the sources the reference speaks on. Labels are
 * qualified by source (`system:A`), and `labelMap` maps them to a reference speaker only
 * when scoreMeeting matched that label to a speaker of that source's role.
 */
export function transcriptInputs(c: MeetingCase, r: ScoredMeetingResult, s: MeetingScore) {
  const turns: RefTurn[] = c.turns.map((t) => ({ start: t.startSec, end: t.endSec, speaker: t.speaker, text: t.refText, event: t.event }));
  const sources = new Set(c.turns.map((t) => sourceOf(t.role)));
  const roleOf = new Map(c.turns.map((t) => [t.speaker, t.role]));
  const labelMap: Record<string, string> = {};
  const segs: HypSegment[] = r.segments
    .filter((x) => x.kept !== false && sources.has(x.source))
    .map((x) => {
      if (!x.label) return { start: x.start, end: x.end, text: x.text, label: null };
      const label = `${x.source}:${x.label}`;
      const speaker = s.labelMap[label] ?? s.labelMap[x.label];
      if (speaker && roleOf.has(speaker) && sourceOf(roleOf.get(speaker)!) === x.source) labelMap[label] = speaker;
      return { start: x.start, end: x.end, text: x.text, label };
    });
  return { turns, segs, labelMap };
}

function caseRows(c: MeetingCase, r: ScoredMeetingResult, s: MeetingScore): { main: string; speakers: string[] } {
  const { turns, segs, labelMap } = transcriptInputs(c, r, s);
  const wer = corpusWer(turns, segs);
  const der = diarizationError(turns, segs, labelMap);
  const lines = turnLines(turns, segs);
  const split = EVENTS.map((e) => {
    const rows = lines.filter((l) => l.event === e);
    return rows.length ? `${e} ${rows.filter(isOverSplit).length}/${rows.length}` : null;
  }).filter(Boolean).join(', ') || 'n/a';
  const werCell = wer ? `${pc(wer.wer)} (${wer.edits}/${wer.refWords})` : 'n/a';
  const derCells = der ? [pc(der.der), pc(der.missSec / der.scoredSec || 0), pc(der.falseAlarmSec / der.scoredSec || 0), pc(der.confusionSec / der.scoredSec || 0)] : ['n/a', 'n/a', 'n/a', 'n/a'];
  const merged = segs.length ? `${s.mergedLines}/${segs.length} = ${pc(s.mergedLines / segs.length)}` : 'n/a';
  return {
    main: `| ${c.id} | ${werCell} | ${derCells.join(' | ')} | ${split} | ${merged} |`,
    speakers: speakerWer(turns, segs, labelMap).map((w) => `| ${c.id} | ${w.speaker} | ${w.labels.join(', ') || '-'} | ${pc(w.wer)} (${w.edits}/${w.refWords}) |`),
  };
}

/** Markdown section with WER, DER and over-split for every case that carries reference text. */
export function transcriptSection(cases: Map<string, MeetingCase>, results: ScoredMeetingResult[], scores: MeetingScore[]): string[] {
  const rows = results.flatMap((r) => {
    const c = cases.get(r.id);
    const s = scores.find((x) => x.id === r.id);
    return c && s && hasReference(c) ? [caseRows(c, r, s)] : [];
  });
  if (!rows.length) return [];
  return [
    '\n## Transcript accuracy (cases with a reference)\n',
    'WER over kept lines vs reference text (normalised); DER at 10 ms frames, 0.25 s collar, overlap scored; over-split = a turn of at most 15 s covered by more than 2 lines.\n',
    '| case | WER | DER | miss | false alarm | confusion | over-split by event | merged lines |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map((x) => x.main),
    '\n### Per-speaker WER (after label mapping)\n',
    '| case | speaker | labels | WER |',
    '|---|---|---|---|',
    ...rows.flatMap((x) => x.speakers),
  ];
}
