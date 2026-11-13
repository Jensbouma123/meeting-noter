import { Button, Text } from '@jensbouma123/acciva-ui';
import { Check, X } from 'lucide-react';
import { useFoldersT } from '../folders/useFoldersT';
import type { FolderSuggestionChipProps } from './folder-suggestion-chip.types';

export function FolderSuggestionChip({ title, suggestion }: FolderSuggestionChipProps) {
  const tf = useFoldersT();
  const { folderLabel, onAccept, onDecline } = suggestion;
  return (
    <div className="flex items-center gap-1 px-3 pb-1.5" data-testid="folder-suggestion">
      <Text size="xs" variant="muted" className="min-w-0 flex-1 truncate">
        {tf('suggestIn').replace('{folder}', folderLabel)}
      </Text>
      <Button
        size="sm"
        variant="outline"
        leadingIcon={<Check className="size-3" />}
        aria-label={tf('suggestAria').replace('{title}', title).replace('{folder}', folderLabel)}
        onClick={onAccept}
      >
        {tf('accept')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        leadingIcon={<X className="size-3" />}
        aria-label={tf('declineAria').replace('{title}', title)}
        onClick={onDecline}
      >
        {tf('decline')}
      </Button>
    </div>
  );
}
