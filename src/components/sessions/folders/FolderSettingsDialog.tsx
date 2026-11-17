import { useState } from 'react';
import { Button, Checkbox, Modal, Textarea } from '@jensbouma123/acciva-ui';
import { ParticipantChips } from '@/components/meeting/ParticipantChips';
import { resolveFolderRoster } from '@/lib/folders/roster';
import { FolderRosterEditor } from './FolderRosterEditor';
import { useFoldersT } from './useFoldersT';
import type { FolderSettingsDialogProps } from './types';

export function FolderSettingsDialog({ folder, folders, onClose, onSave }: FolderSettingsDialogProps) {
  const t = useFoldersT();
  const [roster, setRoster] = useState(folder.roster);
  const [inherit, setInherit] = useState(folder.inheritRoster);
  const [context, setContext] = useState(folder.context);
  const inherited = resolveFolderRoster(folders, folder.parentId);
  const source = folders.find((item) => item.id === inherited.sourceFolderId);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('settingsTitle').replace('{name}', folder.name)}
      footer={
        <div className="dialog-actions flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => onSave(roster, inherit, context)}>{t('save')}</Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">{t('contextTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('contextHint')}</p>
        <Textarea
          value={context}
          rows={3}
          maxLength={1000}
          aria-label={t('contextTitle')}
          placeholder={t('contextPlaceholder')}
          onChange={(event) => setContext(event.target.value)}
        />
        <h3 className="text-sm font-semibold text-foreground">{t('people')}</h3>
        <p className="text-xs text-muted-foreground">{t('rosterHint')}</p>
        <Checkbox checked={inherit} onChange={(event) => setInherit(event.target.checked)} label={t('rosterInherit')} />
        {inherit ? (
          inherited.names.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                {t('rosterInherited').replace('{name}', source?.name ?? '')}
              </p>
              <ParticipantChips names={inherited.names} readOnly listLabel={t('people')} onChange={() => {}} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('rosterEmpty')}</p>
          )
        ) : (
          <FolderRosterEditor names={roster} onChange={setRoster} />
        )}
      </div>
    </Modal>
  );
}
