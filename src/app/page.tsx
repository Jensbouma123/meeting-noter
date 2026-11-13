'use client';

import { sessionPath } from '@/lib/session-path';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Video } from 'lucide-react';
import { Button, Heading, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { createDraftSessionInFolder, listSessions } from '@/lib/meeting/session-store';
import { clearIdleSession } from '@/lib/meeting/session-reset';
import { NewSessionDialog, HomeLayout } from '@/components/sessions';

export default function Home() {
  const t = useT('home');
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
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

  useEffect(() => {
    const latest = listSessions()[0];
    if (latest) router.replace(sessionPath(latest.sessionId));
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from the session index */
    else setEmpty(true);
  }, [router]);

  const handleOpenSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) openNewSession();
      else router.push(sessionPath(sessionId));
    },
    [router, openNewSession],
  );

  const handleCreated = useCallback(
    async (_id: string, title: string) => {
      closeNewSession();
      try {
        const draftId = await createDraftSessionInFolder(title, newDialogFolderId);
        clearIdleSession();
        router.push(sessionPath(draftId));
      } catch { /* best-effort */ }
    },
    [router, newDialogFolderId, closeNewSession],
  );

  if (!empty) return null;

  return (
    <>
      <HomeLayout
        activeSessionId={null}
        onOpenSession={handleOpenSession}
        onNewSession={openNewSession}
      >
        <div className="flex flex-1 items-center justify-center px-4 py-6 md:px-8">
          <VStack spacing="lg" align="center" className="w-full max-w-md text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-elevation-2 text-muted-foreground" aria-hidden="true">
              <Video className="size-7" />
            </div>
            <VStack spacing="sm" align="center">
              <Heading as="h1" size="xl" weight="semibold">{t('title')}</Heading>
              <Text variant="muted">{t('subtitle')}</Text>
            </VStack>
            <section aria-labelledby="home-how-it-works" className="w-full rounded-xl border border-border bg-elevation-1 p-5 text-left">
              <Heading id="home-how-it-works" as="h2" size="md" weight="medium">{t('heading')}</Heading>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li><Text>{t('step1')}</Text></li>
                <li><Text>{t('step2')}</Text></li>
                <li><Text>{t('step3')}</Text></li>
              </ol>
            </section>
            <Button variant="outline" leadingIcon={<Plus className="size-4" />} onClick={() => setNewDialogOpen(true)}>
              {t('newMeeting')}
            </Button>
          </VStack>
        </div>
      </HomeLayout>
      <NewSessionDialog open={newDialogOpen} onClose={closeNewSession} onCreate={handleCreated} />
    </>
  );
}
