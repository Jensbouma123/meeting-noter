import { useMemo } from 'react';
import { getBrowserASRStatusMessage } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import { fillTemplate } from '../fillTemplate';
import type { AsrBannerStateParams } from '../types';

export function useAsrBannerState({ isRecording, asrEnabled, asrPhase, postStop }: AsrBannerStateParams) {
  const t = useT('meeting');

  const asrProblem = useMemo((): string | null => {
    if (!isRecording || !asrEnabled) return null;
    if (asrPhase !== 'blocked' && asrPhase !== 'failed') return null;
    return getBrowserASRStatusMessage() ?? t('unavailable');
  }, [isRecording, asrEnabled, asrPhase, t]);

  const asrPostStop = useMemo((): string | null => {
    if (!asrEnabled || asrPhase !== 'post-stop') return null;
    return getBrowserASRStatusMessage();
  }, [asrEnabled, asrPhase]);

  const postStopDetail =
    postStop === null || postStop.phase === 'recording'
      ? null
      : postStop.phase === 'done'
        ? t('transcriptReady')
        : postStop.phase === 'error'
          ? fillTemplate(t('finishFailed'), { reason: postStop.error ?? t('finishFailedGeneric') })
          : fillTemplate(t('part'), { n: postStop.chunksDone + 1, total: postStop.chunksTotal });

  return { asrProblem, asrPostStop, postStopDetail };
}
