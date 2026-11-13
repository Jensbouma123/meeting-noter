import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@jensbouma123/acciva-ui';
import { Download, MoreHorizontal, Upload } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { downloadFile } from '@/lib/meeting/export-browser';
import { formatWordCsv, formatWordList } from '@/lib/vocabulary/format-word-list';
import type { VocabularyFileMenuProps } from './types';

export function VocabularyFileMenu({ entries, onChooseFile }: VocabularyFileMenuProps) {
  const t = useT('settings');
  return (
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
        <DropdownMenuItem icon={<Upload className="size-4" />} onClick={onChooseFile}>
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
  );
}
