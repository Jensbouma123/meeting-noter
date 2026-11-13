import { useState } from 'react';
import { Button, Input } from '@jensbouma123/acciva-ui';
import { uniqueNames } from '@/lib/meeting/participant-names';
import { ParticipantChips } from '@/components/meeting/ParticipantChips';
import { useFoldersT } from './useFoldersT';
import type { FolderRosterEditorProps } from './types';

export function FolderRosterEditor({ names, onChange }: FolderRosterEditorProps) {
  const t = useFoldersT();
  const [draft, setDraft] = useState('');
  const add = () => {
    const name = draft.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!name) return;
    onChange(uniqueNames([...names, name]));
    setDraft('');
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-end gap-2">
        <Input
          size="sm"
          value={draft}
          aria-label={t('rosterAddLabel')}
          placeholder={t('rosterAddPlaceholder')}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        <Button variant="outline" size="sm" onClick={add}>
          {t('add')}
        </Button>
      </div>
      {names.length > 0 ? (
        <ParticipantChips
          names={names}
          listLabel={t('people')}
          removeLabel={(name) => t('rosterRemove').replace('{name}', name)}
          onChange={onChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('rosterEmpty')}</p>
      )}
    </div>
  );
}
