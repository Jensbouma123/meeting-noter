import { useMemo } from 'react';
import { Badge, Button, Modal } from '@jensbouma123/acciva-ui';
import { Folder } from 'lucide-react';
import { folderPickerOptions, folderSubtreeIds } from '@/lib/folders/folder-tree';
import { FOCUS } from './constants';
import { useFoldersT } from './useFoldersT';
import type { MoveToDialogProps } from './types';

export function MoveToDialog({ target, folders, meetingFolders, onClose, onMove }: MoveToDialogProps) {
  const t = useFoldersT();
  const options = useMemo(() => {
    if (!target) return [];
    const exclude = target.kind === 'folder' ? folderSubtreeIds(folders, target.id) : new Set<string>();
    return folderPickerOptions(folders, exclude);
  }, [target, folders]);
  const current = !target
    ? null
    : target.kind === 'meeting'
      ? (meetingFolders[target.id] ?? null)
      : (folders.find((f) => f.id === target.id)?.parentId ?? null);
  const row = (id: string | null, label: string, depth: number) => (
    <li key={id ?? 'root'}>
      <button
        type="button"
        disabled={id === current}
        aria-current={id === current ? 'true' : undefined}
        onClick={() => target && onMove(target, id)}
        style={{ paddingLeft: `${0.5 + depth}rem` }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-md py-2 pr-2 text-left text-sm hover:bg-surface-hover disabled:opacity-60 ${FOCUS}`}
      >
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{label}</span>
        {id === current && <Badge variant="neutral" size="xs">{t('current')}</Badge>}
      </button>
    </li>
  );
  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={t('moveToTitle').replace('{name}', target?.title ?? '')}
      footer={<Button variant="outline" onClick={onClose}>{t('cancel')}</Button>}
    >
      <ul className="max-h-80 overflow-y-auto" aria-label={t('moveToTitle').replace('{name}', target?.title ?? '')}>
        {row(null, t('topLevel'), 0)}
        {options.map((o) => row(o.id, o.name, o.depth + 1))}
      </ul>
    </Modal>
  );
}
