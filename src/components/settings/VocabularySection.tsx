'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Button, HStack, Select, Text, VStack } from '@jensbouma123/acciva-ui';
import { Download, Plus, Upload, X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { downloadFile } from '@/lib/meeting/export';
import { DEFAULT_BIAS_STRENGTH } from '@/lib/vocabulary/bias';
import {
  addVocabularyEntries,
  removeVocabularyEntry,
  setVocabularyStrength,
  useVocabulary,
} from '@/lib/vocabulary/store';
import { formatWordCsv, formatWordList, parseWordFile, parseWordList } from '@/lib/vocabulary/text-format';
import { SettingsGroup, SettingsRow, SettingsStackedRow } from './SettingsRow';

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/**
 * The user's own words: names and terms the transcript should spell their
 * way. Adding them is meant to need no explanation — paste a list, import a
 * file, or fix a word straight from a transcript (`FixWordAction`).
 */
export function VocabularySection() {
  const t = useT('settings');
  const { entries, strength } = useVocabulary();
  const wordCount = (n: number) => (n === 1 ? t('vocab.one') : fill(t('vocab.many'), { n }));
  const strengthOptions = [
    { value: '0', label: t('vocab.strengthOff') },
    { value: '1.5', label: t('vocab.strengthGentle') },
    { value: String(DEFAULT_BIAS_STRENGTH), label: t('vocab.strengthNormal') },
    { value: '5', label: t('vocab.strengthStrong') },
  ];
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFromText = (text: string) => {
    const parsed = parseWordList(text);
    if (parsed.length === 0) {
      setNotice(t('vocab.noWords'));
      return false;
    }
    addVocabularyEntries(parsed);
    setNotice(fill(t('vocab.added'), { count: wordCount(parsed.length) }));
    return true;
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseWordFile(file.name, await file.text());
      if (parsed.length === 0) {
        setNotice(fill(t('vocab.noWordsIn'), { file: file.name }));
        return;
      }
      addVocabularyEntries(parsed);
      setNotice(fill(t('vocab.addedFrom'), { count: wordCount(parsed.length), file: file.name }));
    } catch {
      setNotice(fill(t('vocab.readError'), { file: file.name }));
    }
  };

  return (
    <SettingsGroup>
      <SettingsStackedRow
        label={t('vocab.title')}
        description={t('vocab.description')}
      >
        <VStack spacing="sm" className="w-full">
          <textarea
            id="vocabulary-paste"
            aria-label={t('vocab.pasteLabel')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={t('vocab.placeholder')}
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <HStack spacing="sm" wrap className="w-full">
            <Button
              variant="primary"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Plus className="size-3.5" />}
              disabled={draft.trim().length === 0}
              onClick={() => {
                if (addFromText(draft)) setDraft('');
              }}
            >
              {t('vocab.add')}
            </Button>
            <Button
              variant="secondary"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Upload className="size-3.5" />}
              onClick={() => fileRef.current?.click()}
            >
              {t('vocab.import')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              className="hidden"
              aria-label={t('vocab.importLabel')}
              onChange={importFile}
            />
          </HStack>
          {notice && (
            <Text size="xs" variant="muted" role="status">
              {notice}
            </Text>
          )}
        </VStack>
      </SettingsStackedRow>

      {entries.length > 0 && (
        <SettingsStackedRow label={fill(t('vocab.inList'), { n: entries.length })}>
          <ul className="flex w-full flex-col divide-y divide-border-subtle" aria-label={t('vocab.title')}>
            {entries.map((entry) => (
              <li key={entry.word} className="flex items-center justify-between gap-3 py-1.5">
                <VStack spacing="none" className="min-w-0">
                  <Text size="sm" weight="medium" className="truncate">
                    {entry.word}
                  </Text>
                  {entry.variants.length > 0 && (
                    <Text size="xs" variant="muted" className="truncate">
                      {fill(t('vocab.alsoFixes'), { list: entry.variants.join(', ') })}
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
            ))}
          </ul>
          <HStack spacing="sm" wrap>
            <Button
              variant="outline"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Download className="size-3.5" />}
              onClick={() => downloadFile('my-words.txt', formatWordList(entries), 'text/plain')}
            >
              {t('vocab.exportTxt')}
            </Button>
            <Button
              variant="outline"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Download className="size-3.5" />}
              onClick={() => downloadFile('my-words.csv', formatWordCsv(entries), 'text/csv')}
            >
              {t('vocab.exportCsv')}
            </Button>
          </HStack>
        </SettingsStackedRow>
      )}

      <details className="group w-full">
        <summary className="cursor-pointer select-none p-4 text-sm font-medium text-text-muted hover:text-text">
          {t('vocab.advanced')}
        </summary>
        <SettingsRow
          label={t('vocab.strength')}
          description={t('vocab.strengthDescription')}
          htmlFor="vocabulary-strength"
          control={
            <Select
              id="vocabulary-strength"
              options={strengthOptions}
              value={strengthOptions.some((o) => Number(o.value) === strength) ? String(strength) : String(DEFAULT_BIAS_STRENGTH)}
              onChange={(value) => setVocabularyStrength(Number(value))}
              aria-label={t('vocab.strength')}
            />
          }
        />
      </details>
    </SettingsGroup>
  );
}
