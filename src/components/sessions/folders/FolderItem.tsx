import { Badge, Button } from '@jensbouma123/acciva-ui';
import { ChevronRight, Folder, FolderOpen, Plus } from 'lucide-react';
import { FOCUS, INITIAL_VISIBLE } from './constants';
import { DraggableMeeting } from './DraggableMeeting';
import { FolderRowMenu } from './FolderRowMenu';
import { RenameInput } from './RenameInput';
import { useFolderRowDrop } from './useFolderRowDrop';
import { useFoldersT } from './useFoldersT';
import type { FolderItemProps } from './types';

export function FolderItem(props: FolderItemProps) {
  const { node, depth, controller, counts, byFolder, collapsed, onToggle, visible, onShowMore, renderSession, onNewSession } = props;
  const t = useFoldersT();
  const { folder } = node;
  const expanded = !collapsed.has(folder.id);
  const allMeetings = byFolder.get(folder.id) ?? [];
  const meetings = allMeetings.slice(0, visible[folder.id] ?? INITIAL_VISIBLE);
  const renaming = controller.renamingId === folder.id;
  const hasContent = node.children.length > 0 || allMeetings.length > 0;
  const { over, rowProps } = useFolderRowDrop({ folderId: folder.id, controller, expanded, hasContent, onToggle });
  const childIndent = `${(depth + 1) * 0.75 + 0.5}rem`;

  return (
    <li>
      <div
        {...rowProps}
        style={{ paddingLeft: `${depth * 0.75}rem` }}
        className={`group flex items-center gap-1 rounded-md pr-1 ${over ? 'bg-surface-hover outline outline-2 -outline-offset-2 outline-primary-500' : 'hover:bg-surface-hover'}`}
      >
        <span
          aria-hidden="true"
          onClick={() => onToggle(folder.id)}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground"
        >
          <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </span>
        {renaming ? (
          <RenameInput initial={folder.name} label={t('name')} onDone={(name) => void controller.rename(folder.id, name)} onCancel={() => controller.setRenamingId(null)} />
        ) : (
          <button
            type="button"
            onClick={() => onToggle(folder.id)}
            aria-expanded={hasContent ? expanded : undefined}
            onKeyDown={(e) => {
              if (e.key === 'F2') controller.setRenamingId(folder.id);
            }}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left text-sm ${FOCUS}`}
          >
            {expanded ? <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <span className="truncate">{folder.name}</span>
            {(counts.get(folder.id) ?? 0) > 0 && <Badge variant="neutral" size="xs">{counts.get(folder.id)}</Badge>}
          </button>
        )}
        {onNewSession && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => {
              if (!expanded) onToggle(folder.id);
              onNewSession(folder.id);
            }}
            tooltip={t('newMeetingIn').replace('{name}', folder.name)}
            aria-label={t('newMeetingIn').replace('{name}', folder.name)}
            leadingIcon={<Plus className="size-4" />}
          />
        )}
        <FolderRowMenu folder={folder} controller={controller} />
      </div>
      {expanded && hasContent && (
        <ul>
          {node.children.map((child) => (
            <FolderItem key={child.folder.id} {...props} node={child} depth={depth + 1} />
          ))}
          {meetings.map((s) => (
            <li key={s.sessionId} style={{ paddingLeft: childIndent }}>
              <DraggableMeeting sessionId={s.sessionId}>{renderSession(s)}</DraggableMeeting>
            </li>
          ))}
          {allMeetings.length > meetings.length && (
            <li style={{ paddingLeft: childIndent }}>
              <Button variant="ghost" size="sm" onClick={() => onShowMore(folder.id)}>{t('showMore')}</Button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
