import { headerRows } from './export-header';
import { groupTurns } from './group-turns';
import { finalSegments, formatClock, formatSrtTime, resolveSpeakerLabel } from './transcript-format';
import type { Segment, Speaker } from './types';
import type { ExportOptions, Turn } from './types/export';

export const OVERLAP_MARK = '[overlap]';

export function toMarkdown(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  title: string,
  options: ExportOptions = {},
): string {
  const turns = groupTurns(segments, speakers, options.callAudioMissing);
  const lines = [`# ${title.trim() || 'Untitled meeting'}`, ''];
  const rows = headerRows(turns, options.startedAt);
  for (const [k, v] of rows) lines.push(`**${k}:** ${v}  `);
  if (rows.length > 0) lines.push('');
  turns.forEach((t, i) => {
    if (i > 0) lines.push('');
    const markdownLineBreak = (j: number) => (j < t.lines.length - 1 ? '  ' : '');
    if (t.overlap) {
      lines.push(...t.lines.map((l, j) =>
        `[${formatClock(l.start)}] ${OVERLAP_MARK} **${l.label}:** ${l.text}${markdownLineBreak(j)}`));
      return;
    }
    lines.push(`**${t.label}**`, '', ...t.lines.map((l, j) => `[${formatClock(l.start)}] ${l.text}${markdownLineBreak(j)}`));
  });
  return lines.join('\n') + '\n';
}

function turnLines(turns: Turn[]): string[] {
  const lines: string[] = [];
  turns.forEach((t, i) => {
    if (i > 0) lines.push('');
    if (t.overlap) {
      lines.push(...t.lines.map((l) => `[${formatClock(l.start)}] ${OVERLAP_MARK} ${l.label}: ${l.text}`));
      return;
    }
    lines.push(t.label, ...t.lines.map((l) => `[${formatClock(l.start)}] ${l.text}`));
  });
  return lines;
}

export function toTranscriptBody(segments: Segment[], speakers: Record<string, Speaker>, options: ExportOptions = {}): string {
  return turnLines(groupTurns(segments, speakers, options.callAudioMissing)).join('\n');
}

export function toPlainText(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  title: string,
  options: ExportOptions = {},
): string {
  const turns = groupTurns(segments, speakers, options.callAudioMissing);
  const lines = [title.trim() || 'Untitled meeting', ''];
  const rows = headerRows(turns, options.startedAt);
  for (const [k, v] of rows) lines.push(`${k}: ${v}`);
  if (rows.length > 0) lines.push('');
  lines.push(...turnLines(turns));
  return lines.join('\n') + '\n';
}

export function toSrt(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  callAudioMissing = false,
): string {
  const finals = finalSegments(segments);
  const cues = finals.map((seg, i) => {
    const end = Math.max(seg.end, seg.start);
    return [
      `${i + 1}`,
      `${formatSrtTime(seg.start)} --> ${formatSrtTime(end)}`,
      `${seg.overlap ? `${OVERLAP_MARK} ` : ''}${resolveSpeakerLabel(seg, speakers, callAudioMissing)}: ${seg.text.trim()}`,
      '',
    ].join('\n');
  });
  return cues.length > 0 ? cues.join('\n') + '\n' : '';
}
