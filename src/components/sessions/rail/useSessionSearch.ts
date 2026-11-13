import { useContext, useEffect, useMemo, useState } from 'react';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { searchMeetingIds } from '@/lib/meeting/server-sync';
import { filterSessions, groupSessionsByDay } from '@/lib/meeting/session-groups';
import { useT } from '@/lib/i18n/useT';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { readTranscriptText } from './readTranscriptText';
import { useDebounced } from './useDebounced';
import type { ServerHits } from './types';

export function useSessionSearch(sessions: SessionMetadata[], meetingFolders: Record<string, string | null>) {
  const t = useT('sidebar');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);
  const [serverHits, setServerHits] = useState<ServerHits | null>(null);
  useEffect(() => {
    let cancelled = false;
    void searchMeetingIds(debouncedQuery).then((ids) => {
      if (!cancelled && ids) setServerHits({ query: debouncedQuery, ids });
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
    const hits = serverHits?.query === debouncedQuery ? serverHits.ids : null;
    const transcriptOf = (id: string) => (hits?.has(id) ? debouncedQuery : readTranscriptText(id));
    return groupSessionsByDay(filterSessions(searching ? sessions : unfiled, debouncedQuery, transcriptOf), undefined, language, {
      today: todayLabel,
      yesterday: yesterdayLabel,
    });
  }, [sessions, unfiled, searching, debouncedQuery, serverHits, language, todayLabel, yesterdayLabel]);

  return { query, setQuery, searching, groups };
}
