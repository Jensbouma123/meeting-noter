/**
 * Presentation helpers for D1 session intelligence: which segment carries
 * which advisory marks, and the window events the D1 UI uses to talk to the
 * transcript and the Fix modal. Nothing here changes text or speakers.
 */
import { hashSegmentText, triageKey } from '@/lib/d1/store';
import type { Segment, SegmentTriage, SessionIntelligence } from '@/lib/meeting/types';

export type D1Tag = 'decision' | 'action_item';

export interface D1SegmentView {
  /** D1's reading of this segment's current text, if it has been analysed. */
  triage?: SegmentTriage;
  /** Decisions / action items D1 read from this segment. */
  tags: readonly D1Tag[];
}

/** Window event: scroll the transcript to a segment. `detail: { segmentId }`. */
export const JUMP_TO_SEGMENT_EVENT = 'mn:jump-to-segment';

export function dispatchJumpToSegment(segmentId: string): void {
  window.dispatchEvent(new CustomEvent(JUMP_TO_SEGMENT_EVENT, { detail: { segmentId } }));
}

/** Window event consumed by `FixWordAction`: `detail: { heard }`. */
export const FIX_WORD_EVENT = 'mn:fix-word';

export function dispatchFixWord(heard: string): void {
  window.dispatchEvent(new CustomEvent(FIX_WORD_EVENT, { detail: { heard } }));
}

/**
 * Index the session's D1 results by segment id, for the segments on screen.
 * Triage is matched on the current text hash, so an edited line shows no
 * stale marks. Returns an empty map while nothing has been analysed.
 */
export function indexD1(
  intelligence: SessionIntelligence,
  segments: readonly Segment[],
): Map<string, D1SegmentView> {
  const index = new Map<string, D1SegmentView>();
  const hasTriage = Object.keys(intelligence.triageBySegment).length > 0;
  const hasItems = intelligence.decisions.length > 0 || intelligence.actionItems.length > 0;
  if (!hasTriage && !hasItems) return index;

  const tagsBySegment = new Map<string, Set<D1Tag>>();
  const tag = (ids: readonly string[], kind: D1Tag) => {
    for (const id of ids) {
      const set = tagsBySegment.get(id) ?? new Set<D1Tag>();
      set.add(kind);
      tagsBySegment.set(id, set);
    }
  };
  for (const d of intelligence.decisions) tag(d.segmentIds, 'decision');
  for (const a of intelligence.actionItems) tag(a.segmentIds, 'action_item');

  for (const seg of segments) {
    if (seg.final === false) continue;
    const triage = hasTriage
      ? intelligence.triageBySegment[triageKey(seg.id, hashSegmentText(seg.text))]
      : undefined;
    const tags = [...(tagsBySegment.get(seg.id) ?? [])];
    if (triage || tags.length > 0) index.set(seg.id, { triage, tags });
  }
  return index;
}

/** `MM:SS` for a segment start, as the transcript shows it. */
export function formatStamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * The words the transcript flagged as uncertain, when D1 has reviewed the
 * line. Empty otherwise: the chip only appears for lines D1 looked at.
 */
export function flaggedWords(segment: Segment, triage: SegmentTriage | undefined): string[] {
  if (!triage || !segment.lowConfSpans?.length) return [];
  return segment.lowConfSpans.map(([start, end]) => segment.text.slice(start, end).trim()).filter(Boolean);
}
