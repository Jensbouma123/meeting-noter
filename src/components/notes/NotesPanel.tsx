'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { EmptyState, VStack } from '@jensbouma123/acciva-ui';
import { addAction, addDecision, getNotes } from '@/lib/meeting/notes';
import { subscribe } from '@/lib/meeting/notes-storage';
import { suggestFromSegments } from '@/lib/meeting/note-suggestions';
import { useT } from '@/lib/i18n/useT';
import { InsightSuggestions } from './InsightSuggestions';
import { ActionRow } from './ActionRow';
import { DecisionRow } from './DecisionRow';
import { NoteSection } from './NoteSection';
import { SuggestionsList } from './SuggestionsList';
import type { NotesPanelProps } from './NotesPanel.types';

export function NotesPanel({ sessionId, speakers = [], segments = [] }: NotesPanelProps) {
  const t = useT('notes');
  const subscribeSession = useCallback((callback: () => void) => subscribe(sessionId, callback), [sessionId]);
  const getSessionNotes = useCallback(() => JSON.stringify(getNotes(sessionId)), [sessionId]);
  const notes = useSyncExternalStore(
    subscribeSession,
    getSessionNotes,
    () => '{"actions":[],"decisions":[]}',
  );
  const parsedNotes = JSON.parse(notes) as ReturnType<typeof getNotes>;
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const suggestions = suggestFromSegments(segments).filter((suggestion) =>
    !dismissed.has(suggestion.sourceSegmentId)
      && !parsedNotes.actions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId)
      && !parsedNotes.decisions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId),
  );
  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  return (
    <VStack spacing="md" className="w-full min-w-0">
      <NoteSection id="notes-actions" title={t('actions')} count={parsedNotes.actions.length} t={t}
        addLabel={t('addAction')} placeholder={t('actionPlaceholder')} empty={t('emptyActions')}
        onSave={(text) => addAction(sessionId, text)}>
        {parsedNotes.actions.map((item) => (
          <ActionRow key={item.id} item={item} speakers={speakers} t={t} sessionId={sessionId} />
        ))}
      </NoteSection>

      <NoteSection id="notes-decisions" title={t('decisions')} count={parsedNotes.decisions.length} t={t}
        addLabel={t('addDecision')} placeholder={t('decisionPlaceholder')} empty={t('emptyDecisions')}
        onSave={(text) => addDecision(sessionId, text)}>
        {parsedNotes.decisions.map((item) => <DecisionRow key={item.id} item={item} sessionId={sessionId} t={t} />)}
      </NoteSection>

      <InsightSuggestions sessionId={sessionId} speakers={speakers} t={t} />

      {suggestions.length > 0 && (
        <SuggestionsList suggestions={suggestions} sessionId={sessionId} t={t} onDismiss={dismiss} />
      )}

      {parsedNotes.actions.length === 0 && parsedNotes.decisions.length === 0 && suggestions.length === 0 && (
        <EmptyState size="sm" compact title={t('emptyTitle')} description={t('empty')} />
      )}
    </VStack>
  );
}
