'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Check, Pencil, X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import {
  removeVocabularyEntry,
  renameVocabularyEntry,
} from '@/lib/vocabulary/store';
import { vocabularyFill as fill } from './vocabularyText';
import { VariantEditor } from './VariantEditor';
import type { VocabularyRowProps } from './types';

export function VocabularyRow({ entry }: VocabularyRowProps) {
  const t = useT('settings');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.word);
  const [error, setError] = useState<string | null>(null);
  const startEdit = () => {
    setDraft(entry.word);
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
  };
  const save = () => {
    const result = renameVocabularyEntry(entry.word, draft);
    if (result === 'ok') cancel();
    else setError(t(result === 'empty' ? 'vocab.editEmpty' : 'vocab.editDuplicate'));
  };
  const onEditKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <VStack spacing="xs" className="min-w-0 flex-1">
        {editing ? (
          <div className="flex w-full items-center gap-1">
            <Input
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={onEditKey}
              aria-label={t('vocab.editLabel')}
              aria-invalid={error ? true : undefined}
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={t('vocab.save')}
              leadingIcon={<Check className="size-4" />}
              onClick={save}
              className="touch-target-44 shrink-0"
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={t('vocab.cancel')}
              leadingIcon={<X className="size-4" />}
              onClick={cancel}
              className="touch-target-44 shrink-0"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              className="min-w-0 truncate rounded text-left text-sm font-medium hover:underline"
            >
              {entry.word}
            </button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={fill(t('vocab.edit'), { word: entry.word })}
              leadingIcon={<Pencil className="size-3.5" />}
              onClick={startEdit}
              className="shrink-0"
            />
          </div>
        )}
        {error && (
          <Text size="xs" role="alert" className="text-danger">
            {error}
          </Text>
        )}
        {entry.source === 'meeting' && (
          <Text size="xs" variant="muted" className="truncate text-text-muted">
            {t('vocab.fromMeeting')}
          </Text>
        )}
        <VariantEditor entry={entry} />
      </VStack>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        tooltip={fill(t('vocab.remove'), { word: entry.word })}
        leadingIcon={<X className="size-4" />}
        onClick={() => removeVocabularyEntry(entry.word)}
        className="touch-target-44 shrink-0"
      />
    </li>
  );
}
