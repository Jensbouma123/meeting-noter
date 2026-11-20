import { withOverlap } from './speaker-overlap-marks';
import type { Segment, SegmentWord } from './types';
import type { EchoVerdict } from './types/echo-verdict';

export function segmentFamilyRoot(id: string): string {
  const at = id.indexOf('~');
  return at < 0 ? id : id.slice(0, at);
}

export function joinWords(words: readonly SegmentWord[]): string {
  return words.map((w) => w.text).join(' ');
}

function familyEcho(parts: readonly Segment[]): EchoVerdict | undefined {
  if (parts.some((p) => p.echo === 'speech')) return 'speech';
  return parts.every((p) => p.echo === 'echo') ? 'echo' : undefined;
}

export function mergeFamily(parts: readonly Segment[]): Segment {
  if (parts.length === 1) return parts[0];
  const ordered = [...parts].sort((a, b) => a.start - b.start);
  const words = ordered.flatMap((p) => p.words ?? []);
  const head = { ...withOverlap(ordered[0], undefined) };
  delete head.echo;
  const echo = familyEcho(ordered);
  return {
    ...head,
    ...(echo ? { echo } : {}),
    id: segmentFamilyRoot(ordered[0].id),
    text: ordered.map((p) => p.text).join(' '),
    start: ordered[0].start,
    end: ordered.reduce((m, p) => Math.max(m, p.end), ordered[0].end),
    final: ordered.every((p) => p.final),
    words,
  };
}
