import { Button } from '@jensbouma123/acciva-ui';
import { Check, Folder, X } from 'lucide-react';
import { useFoldersT } from '../folders/useFoldersT';
import type { FolderSuggestionChipProps } from './folder-suggestion-chip.types';

export function FolderSuggestionChip({ suggestion }: FolderSuggestionChipProps) {
  const tf = useFoldersT();
  const { folderLabel, onAccept, onDecline } = suggestion;
  return (
    <div className="ml-3 mr-12 inline-flex w-fit max-w-[calc(100%-3.75rem)] items-center gap-1.5 rounded-md border border-border-soft bg-muted/40 px-2 py-1" data-testid="folder-suggestion">
      <Folder aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-normal">
        <span className="text-muted-foreground">{tf('suggestIn').replace('{folder}', '').trim()}</span>{' '}
        <span className="font-medium text-foreground">{folderLabel}</span>
      </span>
      <Button
        iconOnly
        size="xs"
        variant="ghost"
        tooltip={tf('accept')}
        leadingIcon={<Check aria-hidden="true" className="size-3.5 text-primary-600 dark:text-primary-300" />}
        aria-label={tf('accept')}
        onClick={onAccept}
      />
      <Button
        iconOnly
        size="xs"
        variant="ghost"
        tooltip={tf('decline')}
        leadingIcon={<X aria-hidden="true" className="size-3.5 text-muted-foreground" />}
        aria-label={tf('decline')}
        onClick={onDecline}
      />
    </div>
  );
}
