import { searchMeetings } from './service';
import type { Hit, SearchDeps } from './types';

export const MIN_LIBRARY_SCORE = 0.35;
export const MAX_LIBRARY_MEETINGS = 8;
const WINDOW_POOL = 24;

export function bestPerMeeting(
  hits: Hit[],
  minScore = MIN_LIBRARY_SCORE,
  maxMeetings = MAX_LIBRARY_MEETINGS,
): Hit[] {
  const best = new Map<string, Hit>();
  for (const hit of hits) {
    if (hit.score < minScore) continue;
    const current = best.get(hit.meetingId);
    if (!current || hit.score > current.score) best.set(hit.meetingId, hit);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, maxMeetings);
}

export async function searchLibrary(
  query: string,
  maxMeetings = MAX_LIBRARY_MEETINGS,
  deps: SearchDeps = {},
): Promise<Hit[]> {
  const hits = await searchMeetings(query, WINDOW_POOL, deps);
  return bestPerMeeting(hits, MIN_LIBRARY_SCORE, maxMeetings);
}
