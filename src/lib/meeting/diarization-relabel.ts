import type { SpeakerTurn } from '@/lib/diarization/browser';
import { overlapsIn } from './diarization-overlaps';
import { speakerFor, speakerNear } from './diarization-speaker-lookup';
import { turnsOf } from './diarization-turns';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { attributeSpeakers } from './speaker-attribution';
import { mergeFamily, segmentFamilyRoot } from './speaker-family';
import { captureSpanOf } from './append-mode';
import { getState } from './store-core';
import { inSegmentFamily, replaceSegmentFamily } from './segment-store';
import type { Segment } from './types';

const RELABEL_LOOKBACK_SEGMENTS = 200;

function overlapKey(seg: Segment): string {
  const o = seg.overlap;
  return o ? `${o.start}-${o.end}-${o.speakers.join()}` : '';
}

function sameParts(a: readonly Segment[], b: readonly Segment[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i].id && s.speaker === b[i].speaker && !!s.unconfirmed === !!b[i].unconfirmed && s.text === b[i].text && overlapKey(s) === overlapKey(b[i]));
}

function previousTurnEnd(turn: SpeakerTurn): number {
  let from = -Infinity;
  for (const other of turnsOf(turn.source)) if (other !== turn && other.start <= turn.start) from = Math.max(from, other.end);
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

export function relabelSegments(turn: SpeakerTurn): void {
  const roots = familyRootsToRelabel(turn, previousTurnEnd(turn));
  for (const root of roots) {
    const family = getState().segments.filter((s) => inSegmentFamily(s.id, root));
    const merged = mergeFamily(family);
    const span = captureSpanOf(merged);
    if (!span) continue;
    const offset = merged.start - span.start;
    const parts = attributeSpeakers(
      merged,
      (a, b) => speakerNear(turn.source, a - offset, b - offset),
      (a, b) => speakerFor(turn.source, a - offset, b - offset),
      (a, b) =>
        overlapsIn(turn.source, a - offset, b - offset).map((o) => ({
          ...o,
          start: o.start + offset,
          end: o.end + offset,
        })),
    );
    if (!sameParts(parts, family)) replaceSegmentFamily(root, parts);
  }
}
