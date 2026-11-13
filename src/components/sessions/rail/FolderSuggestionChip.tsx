import { Button, Text } from '@jensbouma123/acciva-ui';
import { Check, X } from 'lucide-react';
import { useFoldersT } from '../folders/useFoldersT';
import type { FolderSuggestionChipProps } from './folder-suggestion-chip.types';

export function FolderSuggestionChip({ suggestion }: FolderSuggestionChipProps) {
  const tf = useFoldersT();
  const { folderLabel, onAccept, onDecline } = suggestion;
  return (
    <div className="flex items-start gap-1 px-3 pb-1.5" data-testid="folder-suggestion">
      <Text size="xs" variant="muted" className="min-w-0 flex-1 whitespace-normal break-words">
        {tf('suggestIn').replace('{folder}', folderLabel)}
      </Text>
      <Button
        iconOnly
        size="sm"
        variant="outline"
        tooltip={tf('accept')}
        leadingIcon={<Check aria-hidden="true" className="size-3" />}
        aria-label={tf('accept')}
        onClick={onAccept}
      />
      <Button
        iconOnly
        size="sm"
        variant="ghost"
        tooltip={tf('decline')}
        leadingIcon={<X aria-hidden="true" className="size-3" />}
        aria-label={tf('decline')}
        onClick={onDecline}
      />
    </div>
  );
}
