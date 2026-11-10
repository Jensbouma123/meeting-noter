import type { Segment, SegmentOverlap, Speaker } from './types';

export type ExportFormat = 'markdown' | 'txt' | 'srt';

interface FormatMeta {
  value: ExportFormat;
  label: string;
  extension: string;
  mime: string;
}

export const EXPORT_FORMATS: FormatMeta[] = [
  { value: 'markdown', label: 'Markdown', extension: 'md', mime: 'text/markdown' },
  { value: 'txt', label: 'Plain text', extension: 'txt', mime: 'text/plain' },
  { value: 'srt', label: 'Subtitles (SRT)', extension: 'srt', mime: 'text/plain' },
];

/** Final, non-empty segments in chronological order — the exportable transcript. */
export function finalSegments(segments: Segment[]): Segment[] {
  return segments
    .filter((seg) => seg.final && seg.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);
}

export function resolveSpeakerLabel(
  seg: Segment,
  speakers: Record<string, Speaker>,
  callAudioMissing = false,
): string {
  // Mirrors `defaultLabel`: with no call audio the mic hears the whole room, so
  // an unmapped mic speaker is not "You".
  return speakers[seg.speaker]?.label ?? (seg.source === 'mic' && !callAudioMissing ? 'You' : 'Speaker');
}

function pad(n: number, len = 2): string {
  return Math.floor(Math.max(0, n)).toString().padStart(len, '0');
}

/** [MM:SS] clock used by Markdown/TXT lines; grows to [HH:MM:SS] past an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

/** HH:MM:SS,mmm timestamp for SRT cues. */
export function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)},${ms.toString().padStart(3, '0')}`;
}

export interface ExportOptions {
  /** No call audio attached: an unmapped mic speaker is not "You". */
  callAudioMissing?: boolean;
  /** Epoch ms the meeting started; enables the date and clock range in the header. */
  startedAt?: number | null;
}

/** Collapse whitespace and drop the space a recogniser leaves before punctuation. */
export function tidyText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

/** A pause longer than this starts a new turn even for the same speaker. */
export const TURN_PAUSE_SECONDS = 30;

/**
 * Segments in time order, cut into turns: a new turn on every speaker change
 * and after a pause over `TURN_PAUSE_SECONDS`. The live transcript and the
 * Markdown/plain-text exports share these rules, so a copy matches the screen.
 */
export function splitTurns<T extends Segment>(segments: readonly T[]): T[][] {
  // Stable, so segments with the same start keep their arrival order.
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  const turns: T[][] = [];
  let lastEnd = 0;
  for (const seg of ordered) {
    const turn = turns[turns.length - 1];
    if (turn && turn[0].speaker === seg.speaker && seg.start - lastEnd <= TURN_PAUSE_SECONDS) {
      turn.push(seg);
      lastEnd = Math.max(lastEnd, seg.end, seg.start);
    } else {
      turns.push([seg]);
      lastEnd = Math.max(seg.end, seg.start);
    }
  }
  return turns;
}

/** Overlap spans this close together are one stretch of overlapping speech. */
const OVERLAP_JOIN_SECONDS = 0.05;

/** One speaker's turn, or a stretch where several speak at once. */
export type TranscriptBlock<T extends Segment> =
  | { kind: 'turn'; segments: T[] }
  | {
      kind: 'overlap';
      start: number;
      end: number;
      source: T['source'];
      /** Everyone talking, those with words first in the order they start. */
      speakers: string[];
      /** In time order; each is one speaker's (`Segment.speaker`). */
      segments: T[];
    };

function withoutOverlap<T extends Segment>(seg: T): T {
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

/** Least an overlap column holds to be shown as one: this many words… */
export const OVERLAP_MIN_WORDS = 2;
/** …or this many seconds of speech. Less is a back-channel ("I", "yeah"). */
export const OVERLAP_MIN_SECONDS = 0.8;

/** Seconds of speech in `seg`: from its first word to its last, else its span. */
function speechSeconds(seg: Segment): number {
  const words = seg.words;
  if (!words?.length) return Math.max(0, seg.end - seg.start);
  return Math.max(0, words[words.length - 1].end - words[0].start);
}

function wordCount(seg: Segment): number {
  return seg.words?.length || seg.text.split(/\s+/).filter(Boolean).length;
}

type Column = { words: number; seconds: number };

/** Whether every one of two or more columns says enough to be shown as one. */
function columnsHold(columns: ReadonlyMap<string, Column>): boolean {
  if (columns.size < 2) return false;
  return [...columns.values()].every((c) => c.words >= OVERLAP_MIN_WORDS || c.seconds >= OVERLAP_MIN_SECONDS - 1e-6);
}

/** Whether every speaker with words in `segs` says enough to be a column. */
function everyColumnHolds(segs: readonly Segment[]): boolean {
  const columns = new Map<string, Column>();
  for (const seg of segs) {
    const c = columns.get(seg.speaker) ?? { words: 0, seconds: 0 };
    c.words += wordCount(seg);
    c.seconds += speechSeconds(seg);
    columns.set(seg.speaker, c);
  }
  return columnsHold(columns);
}

/** The overlaps `crossSourceOverlaps` made: their segments are one block
 *  whatever their source. */
const crossMarks = new WeakSet<SegmentOverlap>();

/**
 * Unmarked segments of different sources that are spoken at once (the mic's
 * speaker talking over the call), each group marked with one overlap of its
 * own. The diarizer finds overlaps within one source's audio only; two
 * sources are two streams, each word already its speaker's. A group counts
 * when each speaker says, within the time another source's segment of the
 * group spans, `OVERLAP_MIN_WORDS` words or `OVERLAP_MIN_SECONDS` of speech.
 */
function crossSourceOverlaps<T extends Segment>(segments: readonly T[]): Map<T, SegmentOverlap> {
  const ordered = segments.filter((seg) => !seg.overlap && seg.end > seg.start).sort((a, b) => a.start - b.start);
  const marks = new Map<T, SegmentOverlap>();
  if (!ordered.some((seg) => seg.source !== ordered[0].source)) return marks;

  // Connected groups of segments some other source's segment overlaps.
  const groupOf = ordered.map((_, i) => i);
  const root = (i: number): number => (groupOf[i] === i ? i : (groupOf[i] = root(groupOf[i])));
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length && ordered[j].start < ordered[i].end; j += 1) {
      if (ordered[j].source !== ordered[i].source) groupOf[root(j)] = root(i);
    }
  }
  const groups = new Map<number, T[]>();
  ordered.forEach((seg, i) => {
    const members = groups.get(root(i)) ?? [];
    members.push(seg);
    groups.set(root(i), members);
  });

  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const columns = new Map<string, Column>();
    for (const seg of members) {
      const others = members.filter((o) => o.source !== seg.source);
      const heardOver = (t: number) => others.some((o) => t >= o.start && t < o.end);
      const c = columns.get(seg.speaker) ?? { words: 0, seconds: 0 };
      if (seg.words?.length) {
        for (const w of seg.words) {
          if (!heardOver((w.start + w.end) / 2)) continue;
          c.words += 1;
          c.seconds += Math.max(0, w.end - w.start);
        }
      } else {
        const shared = others.reduce((m, o) => Math.max(m, Math.min(seg.end, o.end) - Math.max(seg.start, o.start)), 0);
        c.seconds += shared;
        c.words += Math.round(wordCount(seg) * shared / (seg.end - seg.start));
      }
      columns.set(seg.speaker, c);
    }
    if (!columnsHold(columns)) continue;
    const overlap: SegmentOverlap = {
      start: members[0].start,
      end: members.reduce((m, seg) => Math.max(m, seg.end), members[0].end),
      speakers: [...new Set(members.map((seg) => seg.speaker))],
    };
    crossMarks.add(overlap);
    for (const seg of members) marks.set(seg, overlap);
  }
  return marks;
}

/**
 * Segments in time order, cut into blocks: consecutive segments marked with
 * overlapping spans of one source (`Segment.overlap`) are one overlap block,
 * so are segments of different sources spoken at once
 * (`crossSourceOverlaps`), and the rest are turns by `splitTurns`'s rules. A
 * turn never continues across an overlap. Shared by the live transcript and
 * the exports.
 *
 * An overlap where some speaker says too little to be a column of their own
 * (under `OVERLAP_MIN_WORDS` words and `OVERLAP_MIN_SECONDS` of speech) is
 * ordinary lines again. One source's words come from one speech model stream,
 * each word one speaker's, so a second voice the diarizer hears in the same
 * audio often owns none of them, or a back-channel word: shown as an overlap,
 * its column would be empty, or one "I" beside the other speaker's words.
 */
export function splitTranscript<T extends Segment>(segments: readonly T[]): TranscriptBlock<T>[] {
  const thin = new Set<T>();
  for (const block of splitMarked(segments)) {
    if (block.kind !== 'overlap' || everyColumnHolds(block.segments)) continue;
    for (const seg of block.segments) thin.add(seg);
  }
  const kept = thin.size === 0 ? segments : segments.map((seg) => (thin.has(seg) ? withoutOverlap(seg) : seg));
  const cross = crossSourceOverlaps(kept);
  if (thin.size === 0 && cross.size === 0) return splitMarked(segments);
  return splitMarked(kept.map((seg) => {
    const overlap = cross.get(seg);
    return overlap ? { ...seg, overlap } : seg;
  }));
}

/** `splitTranscript` keeping every marked overlap, however many speak in it. */
function splitMarked<T extends Segment>(segments: readonly T[]): TranscriptBlock<T>[] {
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  const blocks: TranscriptBlock<T>[] = [];
  let run: T[] = [];
  const flushRun = () => {
    for (const turn of splitTurns(run)) blocks.push({ kind: 'turn', segments: turn });
    run = [];
  };
  for (const seg of ordered) {
    const o = seg.overlap;
    if (!o) {
      run.push(seg);
      continue;
    }
    flushRun();
    const last = blocks[blocks.length - 1];
    if (
      last?.kind === 'overlap' &&
      (crossMarks.has(o)
        ? last.segments.some((other) => other.overlap === o)
        : last.source === seg.source &&
          o.start <= last.end + OVERLAP_JOIN_SECONDS &&
          o.end >= last.start - OVERLAP_JOIN_SECONDS)
    ) {
      last.segments.push(seg);
      last.start = Math.min(last.start, o.start);
      last.end = Math.max(last.end, o.end);
      for (const id of o.speakers) if (!last.speakers.includes(id)) last.speakers.push(id);
    } else {
      blocks.push({ kind: 'overlap', start: o.start, end: o.end, source: seg.source, speakers: [...o.speakers], segments: [seg] });
    }
  }
  flushRun();
  for (const block of blocks) {
    if (block.kind !== 'overlap') continue;
    const speaking = [...new Set(block.segments.map((seg) => seg.speaker))];
    block.speakers = [...speaking, ...block.speakers.filter((id) => !speaking.includes(id))];
  }
  return blocks;
}

export interface TurnLine {
  start: number;
  end: number;
  text: string;
  /** Who said the line, on an overlap's lines only (each can be someone else). */
  label?: string;
}

export interface Turn {
  speaker: string;
  label: string;
  start: number;
  end: number;
  lines: TurnLine[];
  /** A stretch of overlapping speech: `lines` are several speakers', in time
   *  order, and `labels` names everyone talking in it. */
  overlap?: { labels: string[] };
}

/** Final, non-empty segments as turns (see `splitTranscript`), one line per segment. */
export function groupTurns(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  callAudioMissing = false,
): Turn[] {
  const tidy = finalSegments(segments)
    .map((seg) => ({ ...seg, text: tidyText(seg.text) }))
    .filter((seg) => seg.text.length > 0);
  const label = (seg: Segment) => resolveSpeakerLabel(seg, speakers, callAudioMissing);
  return splitTranscript(tidy).map((block): Turn => {
    const segs = block.segments;
    const turn: Turn = {
      speaker: segs[0].speaker,
      label: label(segs[0]),
      start: segs[0].start,
      end: segs.reduce((m, seg) => Math.max(m, seg.end, seg.start), 0),
      lines: segs.map((seg) => ({ start: seg.start, end: seg.end, text: seg.text })),
    };
    if (block.kind === 'turn') return turn;
    const labels = block.speakers.map((id) => label({ ...(segs.find((seg) => seg.speaker === id) ?? segs[0]), speaker: id }));
    return {
      ...turn,
      label: labels.join(' + '),
      lines: segs.map((seg) => ({ start: seg.start, end: seg.end, text: seg.text, label: label(seg) })),
      overlap: { labels },
    };
  });
}

/** Marks each line of overlapping speech in the Markdown/plain-text/SRT exports. */
export const OVERLAP_MARK = '[overlap]';

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function clockTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Header rows as [label, value]; date/time rows only when the start is known. */
export function headerRows(turns: Turn[], startedAt: number | null | undefined): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const first = turns[0];
  const spanEnd = turns.reduce((m, t) => Math.max(m, t.end), 0);
  const offset = first ? first.start : 0;
  const duration = Math.max(0, spanEnd - offset);
  if (startedAt) {
    const start = startedAt + offset * 1000;
    rows.push([
      'Date',
      new Date(startedAt).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ]);
    rows.push(['Time', `${clockTime(start)}–${clockTime(start + duration * 1000)}`]);
  }
  if (first) rows.push(['Duration', formatDuration(duration)]);
  const names = [...new Set(turns.flatMap((t) => t.overlap?.labels ?? [t.label]))];
  if (names.length > 0) rows.push(['Participants', names.join(', ')]);
  return rows;
}

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
    // Two trailing spaces: a Markdown line break, one line per timestamp.
    const br = (j: number) => (j < t.lines.length - 1 ? '  ' : '');
    if (t.overlap) {
      lines.push(...t.lines.map((l, j) =>
        `[${formatClock(l.start)}] ${OVERLAP_MARK} **${l.label}:** ${l.text}${br(j)}`));
      return;
    }
    lines.push(`**${t.label}**`, '', ...t.lines.map((l, j) => `[${formatClock(l.start)}] ${l.text}${br(j)}`));
  });
  return lines.join('\n') + '\n';
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
  turns.forEach((t, i) => {
    if (i > 0) lines.push('');
    if (t.overlap) {
      lines.push(...t.lines.map((l) => `[${formatClock(l.start)}] ${OVERLAP_MARK} ${l.label}: ${l.text}`));
      return;
    }
    lines.push(t.label, ...t.lines.map((l) => `[${formatClock(l.start)}] ${l.text}`));
  });
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

export function formatExport(
  format: ExportFormat,
  segments: Segment[],
  speakers: Record<string, Speaker>,
  title: string,
  options: ExportOptions = {},
): string {
  switch (format) {
    case 'markdown':
      return toMarkdown(segments, speakers, title, options);
    case 'txt':
      return toPlainText(segments, speakers, title, options);
    case 'srt':
      return toSrt(segments, speakers, options.callAudioMissing);
  }
}

export function formatMeta(format: ExportFormat): FormatMeta {
  return EXPORT_FORMATS.find((f) => f.value === format) ?? EXPORT_FORMATS[1];
}

/** "Team standup!" → "team-standup", safe for a download filename. */
export function exportFilename(title: string, extension: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'meeting-notes'}.${extension}`;
}

/** Clipboard write with a textarea/execCommand fallback. Resolves true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error('clipboard API unavailable');
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari/Firefox can cancel the download if the URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
