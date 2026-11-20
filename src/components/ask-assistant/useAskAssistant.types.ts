import type { Segment, Speaker } from '@/lib/meeting';

export interface UseAskAssistantInput {
  title: string;
  startedAt: number | null;
  segments: Segment[];
  speakers: Record<string, Speaker>;
}
