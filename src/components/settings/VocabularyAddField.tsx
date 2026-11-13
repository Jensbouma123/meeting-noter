'use client';

import { useState } from 'react';
import { Button, HStack, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Plus } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { addVocabularyEntries } from '@/lib/vocabulary/store';
import { parseWordList } from '@/lib/vocabulary/parse-word-list';
import { vocabularyFill, vocabularyWordCount } from './vocabularyText';
import type { VocabularyAddFieldProps } from './types';

export function VocabularyAddField({
  id,
  children,
  notice: controlledNotice,
  onNotice,
  placeholder,
  onAdded,
}: VocabularyAddFieldProps) {
  const t = useT('settings');
  const [draft, setDraft] = useState('');
  const [ownNotice, setOwnNotice] = useState<string | null>(null);
  const notice = onNotice ? (controlledNotice ?? null) : ownNotice;
  const setNotice = onNotice ?? setOwnNotice;

  const addDraft = () => {
    const parsed = parseWordList(draft);
    if (parsed.length === 0) {
      if (draft.trim()) setNotice(t('vocab.noWords'));
      return;
    }
    addVocabularyEntries(parsed);
    setNotice(vocabularyFill(t('vocab.added'), { count: vocabularyWordCount(t, parsed.length) }));
    onAdded?.(parsed.map((e) => e.word));
    setDraft('');
  };

  return (
    <VStack spacing="sm" className="w-full">
      <HStack spacing="sm" className="w-full">
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            aria-label={t('vocab.pasteLabel')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder ?? t('vocab.placeholder')}
            autoComplete="off"
          />
        </div>
        <Button
          variant="primary"
          size={{ base: 'md', md: 'sm' }}
          leadingIcon={<Plus className="size-3.5" />}
          disabled={draft.trim().length === 0}
          onClick={addDraft}
        >
          {t('vocab.add')}
        </Button>
        {children}
      </HStack>
      {notice && (
        <Text size="xs" variant="muted" role="status">
          {notice}
        </Text>
      )}
    </VStack>
  );
}
