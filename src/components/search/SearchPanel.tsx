'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, EmptyState, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/export';
import type { Hit } from '@/lib/semantic-search';

export const SNIPPET_MAX_CHARS = 160;

/**
 * A short excerpt of `text` around the first query term that occurs in it.
 * Falls back to the text start when no term matches.
 */
export function makeSnippet(text: string, query: string, max = SNIPPET_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const lower = flat.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  let at = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (at === -1 || idx < at)) at = idx;
  }
  if (at === -1) return `${flat.slice(0, max).trimEnd()}…`;
  const from = Math.max(0, at - Math.floor(max / 3));
  const body = flat.slice(from, from + max).trim();
  return `${from > 0 ? '…' : ''}${body}${from + max < flat.length ? '…' : ''}`;
}

export interface SearchPanelProps {
  /** Runs the query. Inject `(q, k) => index.search(q, k)` for a SemanticIndex. */
  search: (query: string, k: number) => Promise<Hit[]>;
  /** Display title per meeting id; falls back to the id. */
  meetingTitles?: Record<string, string>;
  /** Link target for a hit: the session view, seeked to the window start. */
  sessionHref: (meetingId: string, startSeconds: number) => string;
  /** Number of hits requested per query. Default 8. */
  limit?: number;
  /** Debounce before a typed query runs, in ms. Default 250. */
  debounceMs?: number;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; hits: Hit[] }
  | { status: 'error'; message: string };

export function SearchPanel({
  search,
  meetingTitles,
  sessionHref,
  limit = 8,
  debounceMs = 250,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  // Only the newest request may write state; older results are dropped.
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++requestId.current;
    if (q === '') {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    const timer = setTimeout(() => {
      search(q, limit).then(
        (hits) => {
          if (id === requestId.current) setState({ status: 'done', query: q, hits });
        },
        (err: unknown) => {
          if (id === requestId.current) {
            setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
          }
        },
      );
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, search, limit, debounceMs]);

  return (
    <VStack spacing="md" aria-label="Search meetings">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search across meetings"
        aria-label="Search query"
      />

      {state.status === 'loading' && <Text>Searching…</Text>}

      {state.status === 'error' && (
        <Text role="alert">Search failed: {state.message}</Text>
      )}

      {state.status === 'done' && state.hits.length === 0 && (
        <EmptyState title="No matches" description="Try different words." />
      )}

      {state.status === 'done' && state.hits.length > 0 && (
        <ul aria-label="Search results" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {state.hits.map((hit) => {
            const title = meetingTitles?.[hit.meetingId] ?? hit.meetingId;
            const start = hit.window.start;
            return (
              <li key={`${hit.meetingId}:${hit.window.index}`} style={{ marginBottom: 8 }}>
                <Card>
                  <VStack spacing="xs">
                    <a href={sessionHref(hit.meetingId, start)}>
                      <Text weight="semibold">{title}</Text>
                    </a>
                    <Text>
                      {formatClock(start)} · {formatClock(hit.window.end)}
                    </Text>
                    <Text>{makeSnippet(hit.window.text, state.query)}</Text>
                  </VStack>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </VStack>
  );
}
