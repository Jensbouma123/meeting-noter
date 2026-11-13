import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@jensbouma123/acciva-ui';
import { meeting } from '@/components/meeting';
import { sessionPath } from '@/lib/session-path';
import { useT } from '@/lib/i18n/useT';
import { cancelAppend } from '@/lib/meeting/append-mode';
import { getState } from '@/lib/meeting/store-core';
import { startRecordingInSession } from '@/lib/meeting/session-recording';
import { buildStartOptions } from '../buildStartOptions';
import { markSessionActive } from '../markSessionActive';
import type { StartInSessionParams } from '../types';

const cancelIfStillIdle = (target: 'append' | 'new') => {
  if (target === 'append' && getState().status === 'idle') cancelAppend();
};

export function useStartInSession(params: StartInSessionParams) {
  const { initialSessionId, settings, setTitle, setTargetPrompt, setLangOverride, setResumeCandidate } = params;
  const router = useRouter();
  const t = useT('meeting');
  const { toast } = useToast();

  return useCallback(
    async (target: 'append' | 'new') => {
      if (!initialSessionId) return;
      setTargetPrompt(null);
      setLangOverride(null);
      setResumeCandidate(null);
      let id: string | null = null;
      try {
        id = startRecordingInSession(initialSessionId, target);
      } catch {
        id = null;
      }
      if (!id) {
        toast({ title: t('couldNotContinue'), variant: 'warning' });
        return;
      }
      markSessionActive(id, settings.mode);
      try {
        const started = meeting.start(buildStartOptions(settings));
        if (target === 'new') {
          setTitle('Untitled meeting');
          router.push(sessionPath(id));
        }
        await started;
      } catch {
        return cancelIfStillIdle(target);
      }
      cancelIfStillIdle(target);
    },
    [initialSessionId, settings, router, toast, t, setTitle, setTargetPrompt, setLangOverride, setResumeCandidate],
  );
}
