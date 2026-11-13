import { useState } from 'react';
import { Button, Input, Modal, Select, Text, VStack } from '@jensbouma123/acciva-ui';
import { folderPickerOptions } from '@/lib/folders/folder-tree';
import { useFoldersT } from './useFoldersT';
import type { CreateFolderDialogProps } from './types';

export function CreateFolderDialog({ initialParentId, folders, onClose, onCreate }: CreateFolderDialogProps) {
  const t = useFoldersT();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(initialParentId);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    const duplicate = folders.some((folder) => folder.parentId === parentId && folder.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
    if (duplicate) {
      setError(t('nameDuplicate'));
      return;
    }
    if (await onCreate(name, parentId)) onClose();
    else setError(t('errorGeneric'));
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t('newFolder')}
      footer={
        <div className="dialog-actions flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => void submit()}>{t('create')}</Button>
        </div>
      }
    >
      <VStack spacing="sm">
        <Input
          size="sm"
          value={name}
          autoFocus
          maxLength={200}
          aria-label={t('name')}
          placeholder={t('namePlaceholder')}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
        />
        <Select
          label={t('location')}
          value={parentId ?? ''}
          options={[
            { value: '', label: t('topLevel') },
            ...folderPickerOptions(folders).map((folder) => ({
              value: folder.id,
              label: `${'　'.repeat(folder.depth)}${folder.name}`,
            })),
          ]}
          onChange={(value) => {
            setParentId(value || null);
            setError('');
          }}
        />
        {error && <Text role="alert" size="xs" variant="muted">{error}</Text>}
      </VStack>
    </Modal>
  );
}
