'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { EmptyState, VStack } from '@jensbouma123/acciva-ui';
import { addAction, addDecision, getNotesSnapshot, subscribeNotesSnapshot } from '@/lib/meeting/notes';
import { suggestFromSegments } from '@/lib/meeting/note-suggestions';
import { useT } from '@/lib/i18n/useT';
import { useFlashOnAdd } from '@/hooks/useFlashOnAdd';
import { InsightSuggestions } from './InsightSuggestions';
import { ActionRow } from './ActionRow';
import { DecisionRow } from './DecisionRow';
import { NoteSection } from './NoteSection';
import { SuggestionsList } from './SuggestionsList';
import type { Notes } from '@/lib/meeting/types/notes';
import type { NotesPanelProps } from './NotesPanel.types';

const EMPTY_NOTES: Notes = { actions: [], decisions: [] };

export function NotesPanel({ sessionId, speakers = [], segments = [] }: NotesPanelProps) {
  const t = useT('notes');
  const subscribeSession = useCallback((callback: () => void) => subscribeNotesSnapshot(sessionId, callback), [sessionId]);
  const getSessionNotes = useCallback(() => getNotesSnapshot(sessionId), [sessionId]);
  const parsedNotes = useSyncExternalStore(subscribeSession, getSessionNotes, () => EMPTY_NOTES);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const suggestions = suggestFromSegments(segments).filter((suggestion) =>
    !dismissed.has(suggestion.sourceSegmentId)
      && !parsedNotes.actions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId)
      && !parsedNotes.decisions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId),
  );
  const { flash, rowProps } = useFlashOnAdd();
  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  return (
    <VStack spacing="md" className="w-full min-w-0">
      <NoteSection id="notes-actions" title={t('actions')} count={parsedNotes.actions.length} t={t}
        addLabel={t('addAction')} placeholder={t('actionPlaceholder')} empty={t('emptyActions')}
        onSave={(text) => addAction(sessionId, text)}>
        {parsedNotes.actions.map((item) => (
          <ActionRow key={item.id} item={item} speakers={speakers} t={t} sessionId={sessionId} flash={rowProps(item.id)} />
        ))}
      </NoteSection>

      <NoteSection id="notes-decisions" title={t('decisions')} count={parsedNotes.decisions.length} t={t}
        addLabel={t('addDecision')} placeholder={t('decisionPlaceholder')} empty={t('emptyDecisions')}
        onSave={(text) => addDecision(sessionId, text)}>
        {parsedNotes.decisions.map((item) => <DecisionRow key={item.id} item={item} sessionId={sessionId} t={t} flash={rowProps(item.id)} />)}
      </NoteSection>

      <InsightSuggestions sessionId={sessionId} speakers={speakers} t={t} onAdded={flash} />

      {suggestions.length > 0 && (
        <SuggestionsList suggestions={suggestions} sessionId={sessionId} t={t} onDismiss={dismiss} onAdded={flash} />
      )}

      {parsedNotes.actions.length === 0 && parsedNotes.decisions.length === 0 && suggestions.length === 0 && (
        <EmptyState size="sm" compact title={t('emptyTitle')} description={t('empty')} />
      )}
    </VStack>
  );
}
