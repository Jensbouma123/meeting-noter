import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { getNotesSnapshot, subscribeNotesSnapshot } from '@/lib/meeting/notes';
import { dismissInsight, getInsightsSnapshot, loadInsights, subscribeInsights } from '@/lib/semantic-search/insights/store';
import { pushInsights } from '@/lib/semantic-search/insights/sync';
import type { Insight } from '@/lib/semantic-search/insights/types/insight';

export function useInsights(sessionId: string): { visible: Insight[]; dismiss: (id: string) => void } {
  const subInsights = useCallback((cb: () => void) => subscribeInsights(sessionId, cb), [sessionId]);
  const subNotes = useCallback((cb: () => void) => subscribeNotesSnapshot(sessionId, cb), [sessionId]);
  const set = useSyncExternalStore(subInsights, () => getInsightsSnapshot(sessionId), () => null);
  const notes = useSyncExternalStore(subNotes, () => getNotesSnapshot(sessionId), () => null);

  useEffect(() => {
    const stored = loadInsights(sessionId);
    if (stored.items.length > 0) void pushInsights(sessionId, stored);
  }, [sessionId]);

  const visible = useMemo(() => {
    if (!set || !notes) return [];
    const taken = new Set([
      ...notes.decisions.map((d) => `decision:${d.sourceSegmentId}`),
      ...notes.actions.map((a) => `action:${a.sourceSegmentId}`),
    ]);
    return set.items.filter((i) => !set.dismissed.includes(i.id) && !taken.has(`${i.kind}:${i.segmentId}`));
  }, [set, notes]);

  const dismiss = useCallback((id: string) => {
    const set = dismissInsight(sessionId, id);
    void pushInsights(sessionId, set);
  }, [sessionId]);

  return { visible, dismiss };
}
