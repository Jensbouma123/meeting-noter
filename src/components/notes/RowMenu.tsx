import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@jensbouma123/acciva-ui';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { RowMenuProps } from './NotesPanel.types';

export function RowMenu({ t, onEdit, onDelete, name }: RowMenuProps) {
  return <DropdownMenu>
    <DropdownMenuTrigger>
      <Button iconOnly size="sm" variant="ghost" tooltip={t('more')} aria-label={`${t('more')}: ${name}`}
        leadingIcon={<MoreHorizontal aria-hidden="true" className="size-4" />} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {onEdit && <DropdownMenuItem icon={<Pencil aria-hidden="true" className="size-4" />} onClick={onEdit}>{t('edit')}</DropdownMenuItem>}
      <DropdownMenuItem variant="danger" icon={<Trash2 aria-hidden="true" className="size-4" />} onClick={onDelete}>{t('delete')}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
