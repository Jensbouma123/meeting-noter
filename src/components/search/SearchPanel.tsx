'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, EmptyState, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import type { Hit } from '@/lib/semantic-search/types';
import { useT } from '@/lib/i18n/useT';

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

const IDLE: State = { status: 'idle' };

export function SearchPanel({
  search,
  meetingTitles,
  sessionHref,
  limit = 8,
  debounceMs = 250,
}: SearchPanelProps) {
  const t = useT('search');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  // Only the newest request may write state; older results are dropped.
  const requestId = useRef(0);

  // A blank query shows the idle view by derivation; the effect below only runs the debounced request.
  const view: State = query.trim() === '' ? IDLE : state;

  useEffect(() => {
    const q = query.trim();
    const id = ++requestId.current;
    if (q === '') return;
    // Loading is shown as soon as a non-blank query changes; the debounced request below is the external sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <VStack spacing="md" aria-label={t('panelLabel')}>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('placeholder')}
        aria-label={t('queryLabel')}
      />

      {view.status === 'loading' && <Text>{t('searching')}</Text>}

      {view.status === 'error' && (
        <Text role="alert">{t('failed').replace('{message}', view.message)}</Text>
      )}

      {view.status === 'done' && view.hits.length === 0 && (
        <EmptyState title={t('noMatches')} description={t('noMatchesHint')} />
      )}

      {view.status === 'done' && view.hits.length > 0 && (
        <ul aria-label={t('resultsLabel')} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {view.hits.map((hit) => {
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
                    <Text>{makeSnippet(hit.window.text, view.query)}</Text>
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
