import { Button, HStack, Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { folderSubtreeIds } from '@/lib/folders/folder-tree';
import { useFoldersT } from './useFoldersT';
import type { DeleteFolderDialogProps } from './types';

export function DeleteFolderDialog({ folder, folders, meetingFolders, onClose, onConfirm }: DeleteFolderDialogProps) {
  const t = useFoldersT();
  const ids = folder ? folderSubtreeIds(folders, folder.id) : new Set<string>();
  const meetings = Object.values(meetingFolders).filter((f) => f && ids.has(f)).length;
  return (
    <Modal
      open={folder !== null}
      onClose={onClose}
      title={t('deleteTitle')}
      footer={
        <HStack spacing="sm" wrap>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="outline" onClick={() => onConfirm('move-up')}>{t('moveUp')}</Button>
          <Button variant="danger" onClick={() => onConfirm('delete-contents')}>{t('deleteWithContents')}</Button>
        </HStack>
      }
    >
      <VStack spacing="sm">
        <Text size="sm">{t('deleteMoveUpDescription').replace('{name}', folder?.name ?? '')}</Text>
        <Text size="sm" variant="muted">
          {t('deleteWithContentsDescription').replace('{name}', folder?.name ?? '')}
          {meetings > 0 ? ` (${meetings})` : ''}
        </Text>
      </VStack>
    </Modal>
  );
}
