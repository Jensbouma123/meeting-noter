'use client';

import { useState, type ReactNode } from 'react';
import { Button, HStack, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Plus } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { addVocabularyEntries } from '@/lib/vocabulary/store';
import { parseWordList } from '@/lib/vocabulary/text-format';

export const vocabularyFill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

export const vocabularyWordCount = (t: (key: string) => string, n: number) =>
  n === 1 ? t('vocab.one') : vocabularyFill(t('vocab.many'), { n });

/**
 * The "add words" field shared by the Vocabulary tab and onboarding: Enter
 * adds, commas split, and a status line says what was added. `children` sit
 * beside the Add button (the tab puts its import/export menu there).
 */
export function VocabularyAddField({
  id,
  children,
  notice: controlledNotice,
  onNotice,
  placeholder,
  onAdded,
}: {
  id: string;
  children?: ReactNode;
  notice?: string | null;
  onNotice?: (notice: string | null) => void;
  placeholder?: string;
  onAdded?: (words: string[]) => void;
}) {
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
