'use client';

import { sessionPath } from '@/lib/session-path';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useCallback } from 'react';
import MeetingView from './MeetingView';
import { HomeLayout, NewSessionDialog } from '@/components/sessions';
import { createDraftSessionInFolder } from '@/lib/meeting/session-crud';
import { clearIdleSession } from '@/lib/meeting/session-reset';
import { useT } from '@/lib/i18n/useT';
import { Skeleton, Text, useToast, VStack } from '@jensbouma123/acciva-ui';

function MeetingViewShell() {
  const t = useT('meeting');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams<{ sessionId?: string }>();
  const sessionId = params?.sessionId ?? searchParams.get('id') ?? undefined;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogFolderId, setNewDialogFolderId] = useState<string | null>(null);

  const openNewSession = useCallback((folderId?: string) => {
    setNewDialogFolderId(folderId ?? null);
    setNewDialogOpen(true);
  }, []);

  const closeNewSession = useCallback(() => {
    setNewDialogOpen(false);
    setNewDialogFolderId(null);
  }, []);

  const openSessionOrStartNew = useCallback((sid: string) => {
    if (!sid) {
      openNewSession();
      return;
    }
    router.push(sessionPath(sid));
  }, [router, openNewSession]);

  const createDraftAndOpen = useCallback(async (_id: string, title: string) => {
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
        onOpenSession={openSessionOrStartNew}
        onNewSession={openNewSession}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((p) => !p)}
      >
        <MeetingView initialSessionId={sessionId} />
      </HomeLayout>

      <NewSessionDialog
        open={newDialogOpen}
        onClose={closeNewSession}
        onCreate={createDraftAndOpen}
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
