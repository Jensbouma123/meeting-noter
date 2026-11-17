import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Text,
} from '@jensbouma123/acciva-ui';
import { ArrowRight, Eraser, FolderInput, Loader2, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { useFoldersT } from '../folders/useFoldersT';
import type { RailSessionRowMenuProps } from './RailSessionRowMenu.types';

export function RailSessionRowMenu(props: RailSessionRowMenuProps) {
  const t = useT('sidebar');
  const tf = useFoldersT();
  const { open, onOpenChange, title, isActive, locked, suggesting, onOpen, onMove, onSuggest, onClear, onDelete } =
    props;
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('more').replace('{title}', title)}
          leadingIcon={<MoreHorizontal className="size-4" />}
          className="touch-target-44"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isActive && (
          <DropdownMenuItem icon={<ArrowRight className="size-4" />} onClick={onOpen}>
            {t('open')}
          </DropdownMenuItem>
        )}
        {onMove && (
          <DropdownMenuItem icon={<FolderInput className="size-4" />} onClick={onMove}>
            {tf('moveTo')}
          </DropdownMenuItem>
        )}
        {onSuggest && (
          <DropdownMenuItem
            icon={
              suggesting ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles className="size-4" />
              )
            }
            disabled={suggesting}
            aria-busy={suggesting || undefined}
            onClick={onSuggest}
          >
            {tf('suggestFolder')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" icon={<Eraser className="size-4" />} disabled={locked} onClick={onClear}>
          {t('clear')}
        </DropdownMenuItem>
        {locked && (
          <Text size="xs" variant="muted" className="px-2 py-1">
            {t('stopFirst')}
          </Text>
        )}
        <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} disabled={locked} onClick={onDelete}>
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
