'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { Download, MoreHorizontal, Upload } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { downloadFile } from '@/lib/meeting/export-browser';
import { DEFAULT_BIAS_STRENGTH } from '@/lib/vocabulary/constants';
import {
  addVocabularyEntries,
  setVocabularyStrength,
  useVocabulary,
} from '@/lib/vocabulary/store';
import { formatWordCsv, formatWordList } from '@/lib/vocabulary/format-word-list';
import { parseWordFile } from '@/lib/vocabulary/parse-word-file';
import { VocabularyAddField, vocabularyFill as fill, vocabularyWordCount } from './VocabularyAddField';
import { VocabularyRow } from './VocabularyRow';
import { SettingsGroup, SettingsRow, SettingsStackedRow } from './SettingsRow';

/**
 * The user's own words: names and terms the transcript should spell their
 * way. One add field (Enter adds, commas split), a plain list, a small menu
 * for files, and a tip pointing at `FixWordAction` in the transcript.
 */
export function VocabularySection() {
  const t = useT('settings');
  const { entries, strength } = useVocabulary();
  const wordCount = (n: number) => vocabularyWordCount(t, n);
  const strengthOptions = [
    { value: '0', label: t('vocab.strengthOff') },
    { value: '1.5', label: t('vocab.strengthGentle') },
    { value: String(DEFAULT_BIAS_STRENGTH), label: t('vocab.strengthNormal') },
    { value: '5', label: t('vocab.strengthStrong') },
  ];
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      <SettingsStackedRow label={t('vocab.title')} description={t('vocab.description')}>
        <VStack spacing="sm" className="w-full">
          <VocabularyAddField id="vocabulary-add" notice={notice} onNotice={setNotice}>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  tooltip={t('vocab.menu')}
                  leadingIcon={<MoreHorizontal className="size-4" />}
                  className="touch-target-44"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
                  {t('vocab.import')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Download className="size-4" />}
                  disabled={entries.length === 0}
                  onClick={() => downloadFile('my-words.txt', formatWordList(entries), 'text/plain')}
                >
                  {t('vocab.exportTxt')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Download className="size-4" />}
                  disabled={entries.length === 0}
                  onClick={() => downloadFile('my-words.csv', formatWordCsv(entries), 'text/csv')}
                >
                  {t('vocab.exportCsv')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              className="hidden"
              aria-label={t('vocab.importLabel')}
              onChange={importFile}
            />
          </VocabularyAddField>
        </VStack>
      </SettingsStackedRow>

      <SettingsStackedRow label={entries.length > 0 ? fill(t('vocab.inList'), { n: entries.length }) : undefined}>
        {entries.length === 0 ? (
          <Text size="sm" variant="muted">
            {t('vocab.empty')}
          </Text>
        ) : (
          <ul className="flex w-full flex-col divide-y divide-border-subtle" aria-label={t('vocab.title')}>
            {entries.map((entry) => (
              <VocabularyRow key={entry.word} entry={entry} />
            ))}
          </ul>
        )}
        <Text size="xs" variant="muted">
          {t('vocab.tip')}
        </Text>
      </SettingsStackedRow>

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
