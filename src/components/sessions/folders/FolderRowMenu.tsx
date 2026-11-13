import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@jensbouma123/acciva-ui';
import { FolderInput, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useFoldersT } from './useFoldersT';
import type { FolderRowMenuProps } from './types';

export function FolderRowMenu({ folder, controller }: FolderRowMenuProps) {
  const t = useFoldersT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('actions').replace('{name}', folder.name)}
          aria-label={t('actions').replace('{name}', folder.name)}
          leadingIcon={<MoreHorizontal className="size-4" />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem icon={<FolderPlus className="size-4" />} onClick={() => void controller.addFolder(folder.id)}>
          {t('newSubfolder')}
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Pencil className="size-4" />} onClick={() => controller.setRenamingId(folder.id)}>
          {t('rename')}
        </DropdownMenuItem>
        <DropdownMenuItem icon={<FolderInput className="size-4" />} onClick={() => controller.requestMove({ kind: 'folder', id: folder.id, title: folder.name })}>
          {t('moveTo')}
        </DropdownMenuItem>
        <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} onClick={() => controller.requestDelete(folder)}>
          {t('deleteFolder')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
