import type { Segment } from '@/lib/meeting';
import { addAction, addDecision } from '@/lib/meeting/notes';

export function buildTurnActions(sessionId: string | undefined, seg: Segment) {
  if (!sessionId) return undefined;
  return {
    createAction: () => { addAction(sessionId, seg.text, { sourceSegmentId: seg.id }); },
    markDecision: () => { addDecision(sessionId, seg.text, seg.id); },
  };
}
