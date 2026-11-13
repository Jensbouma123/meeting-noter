'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, EmptyState, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { makeSnippet } from './snippet';
import type { SearchPanelProps, SearchState } from './SearchPanel.types';
import { useT } from '@/lib/i18n/useT';

const IDLE: SearchState = { status: 'idle' };
const LOADING: SearchState = { status: 'loading' };

export function SearchPanel({
  search,
  meetingTitles,
  sessionHref,
  limit = 8,
  placeholder,
  debounceMs = 250,
}: SearchPanelProps) {
  const t = useT('search');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ q: string; state: SearchState } | null>(null);
  const requestId = useRef(0);

  const trimmed = query.trim();
  const view: SearchState = trimmed === '' ? IDLE : result?.q === trimmed ? result.state : LOADING;

  useEffect(() => {
    const q = query.trim();
    const id = ++requestId.current;
    if (q === '') return;
    const timer = setTimeout(() => {
      search(q, limit).then(
        (hits) => {
          if (id === requestId.current) setResult({ q, state: { status: 'done', query: q, hits } });
        },
        (err: unknown) => {
          if (id === requestId.current) {
            setResult({ q, state: { status: 'error', message: err instanceof Error ? err.message : String(err) } });
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
        placeholder={placeholder ?? t('placeholder')}
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
