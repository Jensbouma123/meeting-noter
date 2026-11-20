import type { SpeakerTurn } from '@/lib/diarization/browser';
import { overlapsIn } from './diarization-overlaps';
import { speakerFor, speakerNear } from './diarization-speaker-lookup';
import { turnsOf } from './diarization-turns';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { attributeSpeakers } from './speaker-attribution';
import { mergeFamily, segmentFamilyRoot } from './speaker-family';
import { captureSpanOf } from './append-mode';
import { micEchoVerdict } from './echo/segment-echo';
import { getState } from './store-core';
import { replaceSegmentFamilies } from './segment-store';
import type { Segment, Source } from './types';
import type { EchoVerdict } from './types/echo-verdict';

const RELABEL_LOOKBACK_SEGMENTS = 200;

function overlapKey(seg: Segment): string {
  const o = seg.overlap;
  return o ? `${o.start}-${o.end}-${o.speakers.join()}` : '';
}

function sameParts(a: readonly Segment[], b: readonly Segment[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (s, i) =>
        s.id === b[i].id &&
        s.speaker === b[i].speaker &&
        !!s.unconfirmed === !!b[i].unconfirmed &&
        s.text === b[i].text &&
        s.echo === b[i].echo &&
        overlapKey(s) === overlapKey(b[i]),
    )
  );
}

function previousTurnEnd(turn: SpeakerTurn): number {
  let from = -Infinity;
  for (const other of turnsOf(turn.source))
    if (other !== turn && other.start <= turn.start) from = Math.max(from, other.end);
  return Math.min(from, turn.start);
}

function familyRootsToRelabel(turn: SpeakerTurn, from: number): Set<string> {
  const segments = getState().segments;
  const roots = new Set<string>();
  for (let i = segments.length - 1; i >= Math.max(0, segments.length - RELABEL_LOOKBACK_SEGMENTS); i -= 1) {
    const seg = segments[i];
    if (seg.source !== turn.source || isOverlapPassSegment(seg.id)) continue;
    const span = captureSpanOf(seg);
    if (span && ((span.end > from && span.start < turn.end) || seg.unconfirmed)) roots.add(segmentFamilyRoot(seg.id));
  }
  return roots;
}

function priorEcho(family: readonly Segment[], start: number, end: number): EchoVerdict | undefined {
  const verdicts = family.filter((p) => p.end > start && p.start < end).map((p) => p.echo);
  return verdicts.length && verdicts.every((v) => v === verdicts[0]) ? verdicts[0] : undefined;
}

function relabeledParts(source: Source, family: readonly Segment[]): Segment[] | null {
  const merged = mergeFamily(family);
  const span = captureSpanOf(merged);
  if (!span) return null;
  const offset = merged.start - span.start;
  const parts = attributeSpeakers(
    merged,
    (a, b) => speakerNear(source, a - offset, b - offset),
    (a, b) => speakerFor(source, a - offset, b - offset),
    (a, b) =>
      overlapsIn(source, a - offset, b - offset).map((o) => ({
        ...o,
        start: o.start + offset,
        end: o.end + offset,
      })),
    (a, b) => micEchoVerdict(a - offset, b - offset) ?? priorEcho(family, a, b),
  );
  return sameParts(parts, family) ? null : parts;
}

function relabelFamilies(source: Source, families: Iterable<readonly [string, readonly Segment[]]>): void {
  const changes: Array<[string, Segment[]]> = [];
  for (const [root, family] of families) {
    const parts = relabeledParts(source, family);
    if (parts) changes.push([root, parts]);
  }
  replaceSegmentFamilies(changes);
}

export function relabelSegments(turn: SpeakerTurn): void {
  const roots = familyRootsToRelabel(turn, previousTurnEnd(turn));
  const families = new Map<string, Segment[]>();
  for (const seg of getState().segments) {
    const root = segmentFamilyRoot(seg.id);
    if (roots.has(root)) families.set(root, [...(families.get(root) ?? []), seg]);
  }
  relabelFamilies(turn.source, families);
}

export function relabelSource(source: Source): void {
  const families = new Map<string, Segment[]>();
  const eligible = new Set<string>();
  for (const seg of getState().segments) {
    const root = segmentFamilyRoot(seg.id);
    families.set(root, [...(families.get(root) ?? []), seg]);
    if (seg.source === source && !isOverlapPassSegment(seg.id) && captureSpanOf(seg)) eligible.add(root);
  }
  relabelFamilies(
    source,
    [...families].filter(([root]) => eligible.has(root)),
  );
}
