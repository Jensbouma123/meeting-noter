'use client';

import { useMemo } from 'react';
import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { sessionPath } from '@/lib/session-path';
import { useSemanticLibrarySearch } from '../sessions/rail/useSemanticLibrarySearch';
import type { BackfillProgress } from '@/lib/semantic-search/backfill.types';
import type { LibrarySearchProps } from './LibrarySearch.types';
import { SearchPanel } from './SearchPanel';

function progressLabel(progress: BackfillProgress, t: (key: string) => string): string {
  if (progress.done >= progress.total) return t('indexingDone');
  if (progress.done === 0) return t('modelLoading');
  return t('indexing').replace('{done}', String(progress.done)).replace('{total}', String(progress.total));
}

export function LibrarySearch({ sessions, progress }: LibrarySearchProps) {
  const t = useT('search');
  const search = useSemanticLibrarySearch();
  const titles = useMemo(
    () => Object.fromEntries(sessions.map((s) => [s.sessionId, s.title])),
    [sessions],
  );
  const status = progress ? progressLabel(progress, t) : null;
  return (
    <>
      <SearchPanel
        search={search}
        meetingTitles={titles}
        sessionHref={(id, start) => `${sessionPath(id)}?t=${Math.floor(start)}`}
        placeholder={t('libraryPlaceholder')}
      />
      {status && (
        <Text size="sm" variant="muted" role="status">
          {status}
        </Text>
      )}
    </>
  );
}
