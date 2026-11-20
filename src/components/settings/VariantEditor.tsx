import { useState, type KeyboardEvent } from 'react';
import { Input, Text } from '@jensbouma123/acciva-ui';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { addVocabularyVariant, removeVocabularyVariant } from '@/lib/vocabulary/store';
import { vocabularyFill as fill } from './vocabularyText';
import type { VariantEditorProps } from './types';

export function VariantEditor({ entry }: VariantEditorProps) {
  const t = useT('settings');
  const [variantDraft, setVariantDraft] = useState('');
  const [variantError, setVariantError] = useState<string | null>(null);

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
    <>
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
    </>
  );
}
