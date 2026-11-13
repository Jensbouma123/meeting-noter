import { Button, HStack, Text } from '@jensbouma123/acciva-ui';
import { FolderPlus } from 'lucide-react';
import { FolderItem } from './FolderItem';
import { useFolderTreeState } from './useFolderTreeState';
import { useFoldersT } from './useFoldersT';
import type { FolderTreeProps } from './types';

export function FolderTree({ controller, sessions, renderSession, onNewSession }: FolderTreeProps) {
  const t = useFoldersT();
  const { tree, counts, byFolder, visible, showMore, collapsed, toggle } = useFolderTreeState(controller, sessions);

  return (
    <section aria-label={t('title')} className="border-b border-border-subtle pb-1">
      <HStack justify="between" className="px-3 py-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground">{t('title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('newFolder')}
          aria-label={t('newFolder')}
          leadingIcon={<FolderPlus className="size-4" />}
          onClick={() => void controller.addFolder(null)}
        />
      </HStack>
      {tree.length === 0 ? (
        <Text size="xs" variant="muted" className="px-3 py-1">{t('empty')}</Text>
      ) : (
        <ul aria-label={t('title')} className="px-1">
          {tree.map((node) => (
            <FolderItem
              key={node.folder.id}
              node={node}
              depth={0}
              controller={controller}
              counts={counts}
              byFolder={byFolder}
              collapsed={collapsed}
              onToggle={toggle}
              visible={visible}
              onShowMore={showMore}
              renderSession={renderSession}
              onNewSession={onNewSession}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
