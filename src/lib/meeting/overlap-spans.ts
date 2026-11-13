import type { OverlapSpan, OverlapTurn } from './types/overlap-retranscribe';

export const MIN_RETRANSCRIBE_SECONDS = 0.6;

export function overlapSpans(turns: readonly OverlapTurn[], minSeconds = MIN_RETRANSCRIBE_SECONDS): OverlapSpan[] {
  const events: { at: number; speaker: string; delta: 1 | -1 }[] = [];
  for (const turn of turns) {
    if (turn.end <= turn.start) continue;
    events.push({ at: turn.start, speaker: turn.speaker, delta: 1 });
    events.push({ at: turn.end, speaker: turn.speaker, delta: -1 });
  }
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  const spans: OverlapSpan[] = [];
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
      if (at - open.start >= minSeconds) spans.push({ start: open.start, end: at, speakers: [...open.speakers] });
      open = null;
    }
  }
  return spans;
}
