'use client';

import { sessionPath } from '@/lib/session-path';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useCallback } from 'react';
import MeetingView from './MeetingView';
import { HomeLayout, NewSessionDialog } from '@/components/sessions';
import { createDraftSession } from '@/lib/meeting/session-store';
import { clearIdleSession } from '@/lib/meeting/store';
import { Skeleton, Text, useToast, VStack } from '@jensbouma123/acciva-ui';

/* -------------------------------------------------------------------------- */
/* Session page — sidebar rail + meeting view (no separate home route).       */
/* -------------------------------------------------------------------------- */

function MeetingViewShell() {
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

  const handleOpenSession = useCallback((sid: string) => {
    if (!sid) {
      setNewDialogOpen(true);
      return;
    }
    router.push(sessionPath(sid));
  }, [router]);

  const handleNewSessionCreated = useCallback((_id: string, title: string) => {
    setNewDialogOpen(false);
    try {
      const draftId = createDraftSession(title);
      clearIdleSession();
      router.push(sessionPath(draftId));
    } catch {
      toast.danger("Couldn't create the meeting. Try again.");
    }
  }, [router, toast]);

  return (
    <>
      <HomeLayout
        activeSessionId={sessionId ?? null}
        onOpenSession={handleOpenSession}
        onNewSession={() => setNewDialogOpen(true)}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((p) => !p)}
      >
        <MeetingView initialSessionId={sessionId} />
      </HomeLayout>

      {/* New session dialog */}
      <NewSessionDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreate={handleNewSessionCreated}
      />
    </>
  );
}

export default function SessionShell() {
  return (
    <Suspense
      fallback={
        <VStack fill align="center" justify="center" className="h-dvh">
          <Skeleton variant="rounded" width={240} height={20} />
          <Text size="sm" variant="muted">Loading meeting…</Text>
        </VStack>
      }
    >
      <MeetingViewShell />
    </Suspense>
  );
}
