import type { InsightSet } from './types/insight-set';

const EMPTY: InsightSet = { items: [], dismissed: [] };
const listeners = new Map<string, Set<() => void>>();

export function insightsKey(meetingId: string): string {
  return `mn.insights.${meetingId}.v1`;
}

export function loadInsights(meetingId: string): InsightSet {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(insightsKey(meetingId)) ?? 'null') as Partial<InsightSet> | null;
    if (!parsed || !Array.isArray(parsed.items)) return EMPTY;
    return { items: parsed.items, dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [] };
  } catch {
    return EMPTY;
  }
}

export function saveInsights(meetingId: string, set: InsightSet): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(insightsKey(meetingId), JSON.stringify(set));
  } catch {
    return;
  }
  listeners.get(meetingId)?.forEach((l) => l());
}

export function dismissInsight(meetingId: string, insightId: string): InsightSet {
  const set = loadInsights(meetingId);
  if (set.dismissed.includes(insightId)) return set;
  const next = { ...set, dismissed: [...set.dismissed, insightId] };
  saveInsights(meetingId, next);
  return next;
}

export function subscribeInsights(meetingId: string, listener: () => void): () => void {
  const set = listeners.get(meetingId) ?? new Set<() => void>();
  set.add(listener);
  listeners.set(meetingId, set);
  return () => set.delete(listener);
}
