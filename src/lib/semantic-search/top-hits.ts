import type { Hit, MeetingEntry } from './types';
import { dot } from './vector-math';

export function topHits(meetings: Map<string, MeetingEntry>, query: Float32Array, k: number): Hit[] {
  const best: Hit[] = [];
  for (const [meetingId, entry] of meetings) {
    entry.vectors.forEach((v, i) => {
      const score = dot(query, v);
      if (best.length === k && score <= best[k - 1].score) return;
      const hit: Hit = { meetingId, window: entry.windows[i], score };
      let pos = best.length;
      while (pos > 0 && best[pos - 1].score < score) pos--;
      best.splice(pos, 0, hit);
      if (best.length > k) best.pop();
    });
  }
  return best;
}
