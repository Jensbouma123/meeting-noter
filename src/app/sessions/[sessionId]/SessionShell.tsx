'use client';

import { sessionPath } from '@/lib/session-path';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useCallback } from 'react';
import MeetingView from './MeetingView';
import { HomeLayout, NewSessionDialog } from '@/components/sessions';
import { createDraftSessionInFolder } from '@/lib/meeting/session-store';
import { clearIdleSession } from '@/lib/meeting/store';
import { useT } from '@/lib/i18n/useT';
import { Skeleton, Text, useToast, VStack } from '@jensbouma123/acciva-ui';

/* -------------------------------------------------------------------------- */
/* Session page — sidebar rail + meeting view (no separate home route).       */
/* -------------------------------------------------------------------------- */

function MeetingViewShell() {
  const t = useT('meeting');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams<{ sessionId?: string }>();
  // The id is the `[sessionId]` route segment; `?id=` is kept for old links.
  const sessionId = params?.sessionId ?? searchParams.get('id') ?? undefined;

  // Sidebar open state.
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // New session dialog state.
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  // Folder the dialog's meeting is filed in; cleared on close.
  const [newDialogFolderId, setNewDialogFolderId] = useState<string | null>(null);

  const openNewSession = useCallback((folderId?: string) => {
    setNewDialogFolderId(folderId ?? null);
    setNewDialogOpen(true);
  }, []);

  const closeNewSession = useCallback(() => {
    setNewDialogOpen(false);
    setNewDialogFolderId(null);
  }, []);

  const handleOpenSession = useCallback((sid: string) => {
    if (!sid) {
      openNewSession();
      return;
    }
    router.push(sessionPath(sid));
  }, [router, openNewSession]);

  const handleNewSessionCreated = useCallback(async (_id: string, title: string) => {
    const folderId = newDialogFolderId;
    closeNewSession();
    try {
      const draftId = await createDraftSessionInFolder(title, folderId);
      clearIdleSession();
      router.push(sessionPath(draftId));
    } catch {
      toast.danger(t('createFailed'));
    }
  }, [router, toast, t, newDialogFolderId, closeNewSession]);

  return (
    <>
      <HomeLayout
        activeSessionId={sessionId ?? null}
        onOpenSession={handleOpenSession}
        onNewSession={openNewSession}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((p) => !p)}
      >
        <MeetingView initialSessionId={sessionId} />
      </HomeLayout>

      {/* New session dialog */}
      <NewSessionDialog
        open={newDialogOpen}
        onClose={closeNewSession}
        onCreate={handleNewSessionCreated}
      />
    </>
  );
}

function ShellFallback() {
  const t = useT('meeting');
  return (
    <VStack fill align="center" justify="center" className="h-dvh">
      <Skeleton variant="rounded" width={240} height={20} />
      <Text size="sm" variant="muted">{t('loading')}</Text>
    </VStack>
  );
}

export default function SessionShell() {
  return (
    <Suspense
      fallback={<ShellFallback />}
    >
      <MeetingViewShell />
    </Suspense>
  );
}
