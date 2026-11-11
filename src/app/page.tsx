'use client';

import { sessionPath } from '@/lib/session-path';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Video } from 'lucide-react';
import { Button, Heading, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { createDraftSession, listSessions } from '@/lib/meeting/session-store';
import { clearIdleSession } from '@/lib/meeting/store';
import { NewSessionDialog, HomeLayout } from '@/components/sessions';

/* Root — opens the most recent session; with none, a minimal empty state.    */

export default function Home() {
  const t = useT('home');
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    const latest = listSessions()[0];
    if (latest) router.replace(sessionPath(latest.sessionId));
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from the session index */
    else setEmpty(true);
  }, [router]);

  const handleOpenSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) setNewDialogOpen(true);
      else router.push(sessionPath(sessionId));
    },
    [router],
  );

  const handleCreated = useCallback(
    (_id: string, title: string) => {
      setNewDialogOpen(false);
      try {
        const draftId = createDraftSession(title);
        clearIdleSession();
        router.push(sessionPath(draftId));
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
          <VStack spacing="lg" align="center" className="w-full max-w-xl text-center">
            <Video className="size-8 text-primary" aria-hidden="true" />
            <Heading as="h1" size="xl" weight="semibold">{t('title')}</Heading>
            <section aria-labelledby="home-how-it-works" className="w-full">
              <Heading id="home-how-it-works" as="h2" size="lg" weight="medium">{t('heading')}</Heading>
              <ol className="mt-4 space-y-3">
                <li><Text>{t('step1')}</Text></li>
                <li><Text>{t('step2')}</Text></li>
                <li><Text>{t('step3')}</Text></li>
              </ol>
            </section>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => setNewDialogOpen(true)}>
              {t('newMeeting')}
            </Button>
          </VStack>
        </div>
      </HomeLayout>
      <NewSessionDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} onCreate={handleCreated} />
    </>
  );
}
