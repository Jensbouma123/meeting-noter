import type { Hit } from '@/lib/semantic-search/types';

export interface SearchPanelProps {
  search: (query: string, k: number) => Promise<Hit[]>;
  meetingTitles?: Record<string, string>;
  sessionHref: (meetingId: string, startSeconds: number) => string;
  limit?: number;
  placeholder?: string;
  debounceMs?: number;
}

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; hits: Hit[] }
  | { status: 'error'; message: string };
