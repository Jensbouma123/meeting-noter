'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { Drawer, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { useFolderController } from './folders/useFolderController';
import { ClearTranscriptDialog } from './rail/ClearTranscriptDialog';
import { CollapsedRail } from './rail/CollapsedRail';
import { DeleteSessionDialog } from './rail/DeleteSessionDialog';
import { RailBody } from './rail/RailBody';
import { RailHeader } from './rail/RailHeader';
import { RailSearch } from './rail/RailSearch';
import { RailSessionRow } from './rail/RailSessionRow';
import { useBackfillIndex } from './rail/useBackfillIndex';
import { useSessionIndex } from './rail/useSessionIndex';
import { useSessionSearch } from './rail/useSessionSearch';
import type { SessionSidebarProps } from './rail/types';

export function SessionSidebar({ activeSessionId, onOpenSession, onNewSession, open, onToggle }: SessionSidebarProps) {
  const t = useT('sidebar');
  const router = useRouter();
  const { sessions, remove, clear } = useSessionIndex();
  useBackfillIndex(sessions.length);
  const folderCtl = useFolderController(sessions);
  const [deleteTarget, setDeleteTarget] = useState<SessionMetadata | null>(null);
  const [clearTarget, setClearTarget] = useState<SessionMetadata | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { query, setQuery, searching, groups } = useSessionSearch(sessions, folderCtl.meetingFolders);

  useEffect(() => {
    const openDrawer = () => setMobileOpen(true);
    window.addEventListener('mn:open-sessions', openDrawer);
    return () => window.removeEventListener('mn:open-sessions', openDrawer);
  }, []);

  const openSession = useCallback(
    (sessionId: string) => {
      onOpenSession(sessionId);
      setMobileOpen(false);
    },
    [onOpenSession]
  );

  const renderRow = (session: SessionMetadata, pathLabel?: string) => (
    <RailSessionRow
      key={session.sessionId}
      session={session}
      isActive={activeSessionId === session.sessionId}
      pathLabel={pathLabel}
      onOpen={() => openSession(session.sessionId)}
      onClear={() => setClearTarget(session)}
      onDelete={() => setDeleteTarget(session)}
      onMove={() => folderCtl.requestMove({ kind: 'meeting', id: session.sessionId, title: session.title })}
    />
  );

  const railBody = (
    <VStack spacing="none" fill className="h-full bg-surface">
      <RailHeader sessionCount={sessions.length} open={open} onNewSession={() => onNewSession()} onToggle={onToggle} />
      {sessions.length > 0 && <RailSearch query={query} onChange={setQuery} />}
      <RailBody sessions={sessions} groups={groups} searching={searching} folderCtl={folderCtl} renderRow={renderRow} onNewSession={onNewSession} />
    </VStack>
  );

  return (
    <>
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        side="left"
        detent="full"
        minSize={260}
        defaultSize={300}
        maxSize={360}
        draggable
        swipeToDismiss
        showCloseOnTouch
        aria-label={t('meetings')}
        className="lg:hidden"
      >
        {railBody}
      </Drawer>

      <aside
        aria-label={t('meetings')}
        className={[
          'hidden shrink-0 border-r border-border-subtle transition-[width] duration-200 ease-in-out motion-reduce:transition-none lg:flex lg:flex-col',
          open ? 'w-72 xl:w-80' : 'w-16',
        ].join(' ')}
      >
        {open ? railBody : <CollapsedRail onNewSession={() => onNewSession()} onToggle={onToggle} />}
      </aside>

      {folderCtl.dialogs}

      <ClearTranscriptDialog
        session={clearTarget}
        onClose={() => setClearTarget(null)}
        onConfirm={(id) => {
          clear(id);
          setClearTarget(null);
        }}
      />

      <DeleteSessionDialog
        session={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => {
          const removed = remove(id);
          setDeleteTarget(null);
          if (removed && id === activeSessionId) router.replace('/');
        }}
      />
    </>
  );
}
