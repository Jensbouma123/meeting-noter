import { useContext, useEffect, useMemo, useState } from 'react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { searchMeetingIds } from '@/lib/meeting/sync-control';
import { filterSessions, groupSessionsByDay } from '@/lib/meeting/session-groups';
import { useT } from '@/lib/i18n/useT';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { lowerTranscriptText } from './transcriptTextCache';
import { useDebounced } from './useDebounced';

export function useSessionSearch(sessions: SessionMetadata[], meetingFolders: Record<string, string | null>) {
  const t = useT('sidebar');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);
  const [serverHits, setServerHits] = useState<{ query: string; ids: Set<string> | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void searchMeetingIds(debouncedQuery).then((ids) => {
      if (!cancelled) setServerHits({ query: debouncedQuery, ids });
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);
  const language = useContext(LanguageContext) ?? 'en';
  const todayLabel = t('today');
  const yesterdayLabel = t('yesterday');
  const unfiled = useMemo(() => sessions.filter((s) => !meetingFolders[s.sessionId]), [sessions, meetingFolders]);
  const searching = debouncedQuery.trim() !== '';
  const groups = useMemo(() => {
    const answered = serverHits?.query === debouncedQuery;
    const hits = answered ? serverHits.ids : null;
    const updatedAtOf = new Map(sessions.map((s) => [s.sessionId, s.updatedAt]));
    const transcriptOf = (id: string) => {
      if (!answered) return '';
      if (hits) return hits.has(id) ? debouncedQuery : '';
      return lowerTranscriptText(id, updatedAtOf.get(id) ?? 0);
    };
    return groupSessionsByDay(filterSessions(searching ? sessions : unfiled, debouncedQuery, transcriptOf), undefined, language, {
      today: todayLabel,
      yesterday: yesterdayLabel,
    });
  }, [sessions, unfiled, searching, debouncedQuery, serverHits, language, todayLabel, yesterdayLabel]);

  return { query, setQuery, searching, groups };
}
