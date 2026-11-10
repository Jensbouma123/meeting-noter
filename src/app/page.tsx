'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Video } from 'lucide-react';
import { Button, EmptyState } from '@jensbouma123/acciva-ui';
import { createDraftSession, listSessions } from '@/lib/meeting/session-store';
import { clearIdleSession } from '@/lib/meeting/store';
import { NewSessionDialog, HomeLayout } from '@/components/sessions';

/* Root — opens the most recent session; with none, a minimal empty state.    */

export default function Home() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    const latest = listSessions()[0];
    if (latest) router.replace(`/sessions/${latest.sessionId}`);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from the session index */
    else setEmpty(true);
  }, [router]);

  const handleOpenSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) setNewDialogOpen(true);
      else router.push(`/sessions/${sessionId}`);
    },
    [router],
  );

  const handleCreated = useCallback(
    (_id: string, title: string) => {
      setNewDialogOpen(false);
      try {
        const draftId = createDraftSession(title);
        clearIdleSession();
        router.push(`/sessions/${draftId}`);
      } catch { /* best-effort */ }
    },
    [router],
  );

  if (!empty) return null;

  return (
    <>
      <HomeLayout
        activeSessionId={null}
        onOpenSession={handleOpenSession}
        onNewSession={() => setNewDialogOpen(true)}
      >
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            size="md"
            icon={<Video className="size-7" />}
            title="No meetings yet"
            description="Start a meeting to get a live transcript — all on this device."
            action={
              <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => setNewDialogOpen(true)}>
                New meeting
              </Button>
            }
          />
        </div>
      </HomeLayout>
      <NewSessionDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} onCreate={handleCreated} />
    </>
  );
}
