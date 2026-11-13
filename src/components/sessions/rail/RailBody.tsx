import { Button, EmptyState, VStack } from '@jensbouma123/acciva-ui';
import { Plus, Search, Video } from 'lucide-react';
import { folderPath } from '@/lib/folders/folder-tree';
import { useT } from '@/lib/i18n/useT';
import { DraggableMeeting } from '../folders/DraggableMeeting';
import { FolderTree } from '../folders/FolderTree';
import type { RailBodyProps } from './types';

export function RailBody({ sessions, groups, searching, folderCtl, renderRow, onNewSession }: RailBodyProps) {
  const t = useT('sidebar');
  const folderTree = !searching && (
    <FolderTree controller={folderCtl} sessions={sessions} renderSession={(session) => renderRow(session)} onNewSession={onNewSession} />
  );
  return (
    <VStack spacing="none" fill className="flex-1 scroll-pt-10 overflow-y-auto">
      {sessions.length === 0 ? (
        <>
          {folderTree}
          <EmptyState
            size="sm"
            icon={<Video className="size-5" />}
            title={t('empty')}
            description={t('emptyHint')}
            action={
              <Button size="sm" variant="outline" leadingIcon={<Plus className="size-4" />} onClick={() => onNewSession()}>
                {t('new')}
              </Button>
            }
            className="my-auto"
          />
        </>
      ) : searching && groups.length === 0 ? (
        <EmptyState size="sm" icon={<Search className="size-5" />} title={t('noResults')} className="my-auto" />
      ) : (
        <>
          {folderTree}
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.label}
              </h3>
              <VStack spacing="none" className="w-full px-3 pb-2 pt-1">
                {group.sessions.map((session) =>
                  searching ? (
                    renderRow(session, folderPath(folderCtl.folders, folderCtl.meetingFolders[session.sessionId]).join(' / '))
                  ) : (
                    <DraggableMeeting key={session.sessionId} sessionId={session.sessionId}>
                      {renderRow(session)}
                    </DraggableMeeting>
                  ),
                )}
              </VStack>
            </section>
          ))}
        </>
      )}
    </VStack>
  );
}
