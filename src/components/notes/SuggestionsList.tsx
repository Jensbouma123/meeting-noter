import { useState } from 'react';
import { Button, Text } from '@jensbouma123/acciva-ui';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { addAction, addDecision } from '@/lib/meeting/notes';
import type { SuggestionsListProps } from './NotesPanel.types';

export function SuggestionsList({ suggestions, sessionId, t, onDismiss }: SuggestionsListProps) {
  const [open, setOpen] = useState(false);
  return <section aria-label={t('suggestions')} className="w-full min-w-0">
    <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
      className="flex w-full min-w-0 items-center gap-1 rounded-md py-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1">
      {open ? <ChevronDown aria-hidden="true" className="size-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="size-4 shrink-0" />}
      <span className="truncate">{t('suggestions')} ({suggestions.length})</span>
    </button>
    {open && <ul className="mt-1 flex w-full min-w-0 flex-col gap-1">
      {suggestions.map((suggestion) => <li key={suggestion.sourceSegmentId} className="flex min-w-0 items-center gap-1">
        <Text size="xs" className="min-w-0 flex-1 truncate" title={suggestion.text}>{suggestion.text}</Text>
        <Button iconOnly size="sm" variant="ghost" tooltip={t('addSuggestion')} aria-label={`${t('addSuggestion')}: ${suggestion.text}`}
          leadingIcon={<Plus aria-hidden="true" className="size-4" />}
          onClick={() => suggestion.kind === 'action'
            ? addAction(sessionId, suggestion.text, { sourceSegmentId: suggestion.sourceSegmentId })
            : addDecision(sessionId, suggestion.text, suggestion.sourceSegmentId)} />
        <Button iconOnly size="sm" variant="ghost" tooltip={t('dismissSuggestion')} aria-label={`${t('dismissSuggestion')}: ${suggestion.text}`}
          leadingIcon={<X aria-hidden="true" className="size-4" />}
          onClick={() => onDismiss(suggestion.sourceSegmentId)} />
      </li>)}
    </ul>}
  </section>;
}
