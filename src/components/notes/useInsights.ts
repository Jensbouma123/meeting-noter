import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { getNotes } from '@/lib/meeting/notes';
import { subscribe as subscribeNotes } from '@/lib/meeting/notes-storage';
import { dismissInsight, loadInsights, subscribeInsights } from '@/lib/semantic-search/insights/store';
import { pushInsights } from '@/lib/semantic-search/insights/sync';
import type { Insight } from '@/lib/semantic-search/insights/types/insight';

export function useInsights(sessionId: string): { visible: Insight[]; dismiss: (id: string) => void } {
  const subInsights = useCallback((cb: () => void) => subscribeInsights(sessionId, cb), [sessionId]);
  const subNotes = useCallback((cb: () => void) => subscribeNotes(sessionId, cb), [sessionId]);
  const rawInsights = useSyncExternalStore(subInsights, () => JSON.stringify(loadInsights(sessionId)), () => '');
  const rawNotes = useSyncExternalStore(subNotes, () => JSON.stringify(getNotes(sessionId)), () => '');

  useEffect(() => {
    const set = loadInsights(sessionId);
    if (set.items.length > 0) void pushInsights(sessionId, set);
  }, [sessionId]);

  const visible = useMemo(() => {
    if (rawInsights === '' || rawNotes === '') return [];
    const set = JSON.parse(rawInsights) as ReturnType<typeof loadInsights>;
    const notes = JSON.parse(rawNotes) as ReturnType<typeof getNotes>;
    const taken = new Set([
      ...notes.decisions.map((d) => `decision:${d.sourceSegmentId}`),
      ...notes.actions.map((a) => `action:${a.sourceSegmentId}`),
    ]);
    return set.items.filter((i) => !set.dismissed.includes(i.id) && !taken.has(`${i.kind}:${i.segmentId}`));
  }, [rawInsights, rawNotes]);

  const dismiss = useCallback((id: string) => {
    const set = dismissInsight(sessionId, id);
    void pushInsights(sessionId, set);
  }, [sessionId]);

  return { visible, dismiss };
}
