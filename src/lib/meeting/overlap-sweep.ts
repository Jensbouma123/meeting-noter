import type { OverlapSpan } from './types/overlap-retranscribe';
import type { TurnEdge } from './types/diarization-bridge';

export function sortEdges(events: TurnEdge[]): void {
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
}

export function sweepOverlaps(
  events: readonly TurnEdge[],
  accept: (span: { start: number; end: number }) => boolean,
): OverlapSpan[] {
  const found: OverlapSpan[] = [];
  const active = new Map<string, number>();
  let open: { start: number; speakers: Set<string> } | null = null;
  for (const { at, speaker, delta } of events) {
    const count = (active.get(speaker) ?? 0) + delta;
    if (count > 0) active.set(speaker, count);
    else active.delete(speaker);
    if (active.size >= 2) {
      open ??= { start: at, speakers: new Set() };
      for (const who of active.keys()) open.speakers.add(who);
    } else if (open) {
      if (accept({ start: open.start, end: at }))
        found.push({ start: open.start, end: at, speakers: [...open.speakers] });
      open = null;
    }
  }
  return found;
}
