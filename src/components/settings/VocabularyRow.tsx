'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Check, Pencil, X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import {
  addVocabularyVariant,
  removeVocabularyEntry,
  removeVocabularyVariant,
  renameVocabularyEntry,
} from '@/lib/vocabulary/store';
import type { VocabularyEntry } from '@/lib/vocabulary/types';
import { vocabularyFill as fill } from './VocabularyAddField';

/**
 * One word in the list. Click the word or the pencil to edit it in place
 * (Enter saves, Esc cancels); what it corrects shows as removable chips with
 * a small field to add another misheard version.
 */
export function VocabularyRow({ entry }: { entry: VocabularyEntry }) {
  const t = useT('settings');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.word);
  const [error, setError] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState('');
  const [variantError, setVariantError] = useState<string | null>(null);
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

  const addVariant = () => {
    const result = addVocabularyVariant(entry.word, variantDraft);
    if (result === 'ok') {
      setVariantDraft('');
      setVariantError(null);
    } else if (result === 'duplicate') setVariantError(t('vocab.variantDuplicate'));
  };
  const onVariantKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addVariant();
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
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.variants.length > 0 && (
            <Text size="xs" variant="muted">
              {t('vocab.misheard')}
            </Text>
          )}
          {entry.variants.map((variant) => (
            <span
              key={variant}
              className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-xs"
            >
              {variant}
              <button
                type="button"
                aria-label={fill(t('vocab.removeVariant'), { variant })}
                onClick={() => removeVocabularyVariant(entry.word, variant)}
                className="rounded-full text-text-muted hover:text-text"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <Input
            value={variantDraft}
            onChange={(e) => {
              setVariantDraft(e.target.value);
              setVariantError(null);
            }}
            onKeyDown={onVariantKey}
            placeholder={t('vocab.addMisheard')}
            aria-label={fill(t('vocab.addMisheardFor'), { word: entry.word })}
            className="h-7 w-44 text-xs"
          />
        </div>
        {variantError && (
          <Text size="xs" role="alert" className="text-danger">
            {variantError}
          </Text>
        )}
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
