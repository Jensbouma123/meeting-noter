import { sortEdges, sweepOverlaps } from './overlap-sweep';
import type { TurnEdge } from './types/diarization-bridge';
import type { OverlapSpan, OverlapTurn } from './types/overlap-retranscribe';

export const MIN_RETRANSCRIBE_SECONDS = 0.6;

export function overlapSpans(turns: readonly OverlapTurn[], minSeconds = MIN_RETRANSCRIBE_SECONDS): OverlapSpan[] {
  const events: TurnEdge[] = [];
  for (const turn of turns) {
    if (turn.end <= turn.start) continue;
    events.push({ at: turn.start, speaker: turn.speaker, delta: 1 });
    events.push({ at: turn.end, speaker: turn.speaker, delta: -1 });
  }
  sortEdges(events);
  return sweepOverlaps(events, (span) => span.end - span.start >= minSeconds);
}
