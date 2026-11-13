import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { useAsrBannerState } from './useAsrBannerState';
import { useMeetingToasts } from './useMeetingToasts';
import type { MeetingBannerStateParams, BannerKind } from '../types';

export function useMeetingBannerState(params: MeetingBannerStateParams) {
  const { initialSessionId, otherRecording, error, warning, modelProgress, modelReadiness, ...asr } = params;
  const { asrProblem, asrPostStop, postStopDetail } = useAsrBannerState(asr);
  useMeetingToasts({ error, warning, modelPreparing: Boolean(modelProgress.stage), modelReadiness, asrProblem });

  const otherBanner = !!(initialSessionId && otherRecording && getTranscriptSessionId() !== initialSessionId);
  const banner: BannerKind = otherBanner ? 'other' : asrProblem ? 'problem' : asrPostStop ? 'postStop' : null;
  return { banner, asrProblem, asrPostStop, postStopDetail };
}
