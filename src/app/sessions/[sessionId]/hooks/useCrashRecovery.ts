import { useCallback, useEffect } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { saveTitle } from '@/components/meeting';
import { useT } from '@/lib/i18n/useT';
import { restoreSnapshot } from '@/lib/meeting/session-reset';
import { bindTranscriptSession, getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { renameSession } from '@/lib/meeting/session-crud';
import { fillTemplate } from '../fillTemplate';
import type { CrashRecoveryParams } from '../types';

export function useCrashRecovery({
  initialSessionId,
  resumeCandidate,
  setResumeCandidate,
  setTitle,
  segmentCount,
  status,
}: CrashRecoveryParams) {
  const t = useT('meeting');
  const { toast, dismiss } = useToast();

  const restoreCandidate = useCallback(() => {
    if (!resumeCandidate) return;
    try {
      restoreSnapshot(resumeCandidate.segments, resumeCandidate.speakers, resumeCandidate.startedAt);
      bindTranscriptSession(resumeCandidate.sessionId);
      setTitle(resumeCandidate.title);
      if (initialSessionId) renameSession(initialSessionId, resumeCandidate.title);
      else saveTitle(resumeCandidate.title);
    } catch {
      setResumeCandidate(null);
      return;
    }
    setResumeCandidate(null);
  }, [resumeCandidate, initialSessionId, setTitle, setResumeCandidate]);

  const candidateOnScreen =
    resumeCandidate !== null &&
    segmentCount > 0 &&
    getTranscriptSessionId() === resumeCandidate.sessionId;
  const showResume = resumeCandidate !== null && status === 'idle' && !candidateOnScreen;

  useEffect(() => {
    if (!showResume || !resumeCandidate) return;
    const lines = resumeCandidate.segments.length;
    const id = toast.info(
      fillTemplate(t('restoreBody'), {
        title: resumeCandidate.title,
        lines: fillTemplate(t(lines === 1 ? 'restoreLineOne' : 'restoreLineMany'), { n: lines }),
      }),
      {
        title: t('restoreTitle'),
        action: { label: t('restore'), onClick: restoreCandidate },
      },
    );
    return () => dismiss(id);
  }, [showResume, resumeCandidate, restoreCandidate, toast, dismiss, t]);
}
