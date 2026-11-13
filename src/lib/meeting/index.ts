import { useSyncExternalStore } from 'react';
import './asr/init';
import { addFixedWord } from '@/lib/vocabulary/store';
import { disposeSharedEmbedder } from '@/lib/semantic-search/service';
import { disableBrowserASR, enableBrowserASR } from './asr/controls';
import { releaseCapture } from './capture-release';
import { setLanguageOverride } from './langid-bridge';
import { INITIAL_STATE } from './initial-state';
import './post-stop-intelligence';
import { pauseMeeting, resumeMeeting } from './session-pause';
import { startMeeting } from './session-start';
import { stopMeeting } from './session-stop';
import { applyVocabularyToTranscript } from './segment-store';
import { getState, subscribe } from './store-core';
import { renameSpeaker as storeRenameSpeaker } from './speaker-registry';
import { subscribeLevels as storeSubscribeLevels } from './levels-bus';
import type { Levels, MeetingState, StartOpts } from './types';

export type { CaptureMode, LanguageInfo, Levels, MeetingState, Source, Status, Segment, Speaker, StartOpts, SystemVia } from './types';
export type { MeetingDiagnostics } from './types/diagnostics';
export { getCallAudioMissing, subscribeCallAudio } from './call-audio-missing';
export { getMeetingDiagnostics } from './diagnostics';
export { useSpeakerStats, computeSpeakerStats } from './speaker-stats';
export type { SpeakerStat } from './types/speaker-stat';
export { enableBrowserASR, disableBrowserASR, getBrowserASREnabled, getBrowserASRReady, getBrowserASRLoading, getBrowserASRFailed, getBrowserASRError } from './asr/controls';
export { resetBrowserASR } from './asr/reset';
export { getBrowserASRPhase, getBrowserASRStatusMessage } from './asr/phase';
export { getBrowserASRProgress, getServerBrowserASRProgress } from './asr/progress-build';
export { ensureBrowserASRReady, warmBrowserASR } from './asr/engine-acquire';
export { promptBrowserASRDownload, didPreviousModelLoadCrash, retryCrashedLoadWithSmallerModel } from './asr/crash-recovery';
export { subscribeBrowserASR } from './asr/listeners';
export { setSpeakerLabeler } from './asr/speaker';
export { resolveAsrBackend, isPostStopTranscriptionOnly } from './asr/backend';
export { isPostStopTranscriptionRunning, getServerPostStopProgress, subscribePostStopTranscription } from './post-stop-progress';
export { transcribeRecordedAudioAfterStop, getPostStopTranscriptionProgress } from './asr/post-stop-run';
export { POST_STOP_MESSAGE } from './asr/constants';
export type { BrowserASRProgress } from './types/asr-progress';
export type { SpeakerLabeler } from './types/asr-speaker';
export type { PostStopProgress, PostStopPhase } from './types/post-stop';

export function useMeeting<T>(selector: (s: MeetingState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(INITIAL_STATE));
}

async function listMicDevices(): Promise<MediaDeviceInfo[]> {
  const mediaDevices =
    typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!mediaDevices?.enumerateDevices) return [];
  const devices = await mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}

export const meeting = {
  start: (opts: StartOpts): Promise<void> => startMeeting(opts),
  stop: (): Promise<void> => stopMeeting(),

  release(): Promise<void> {
    const stopped = meeting.stop();
    void releaseCapture();
    disposeSharedEmbedder();
    return stopped;
  },

  pause: pauseMeeting,
  resume: resumeMeeting,

  renameSpeaker(id: string, label: string): void {
    storeRenameSpeaker(id, label);
  },

  fixWord(heard: string, word: string): void {
    if (addFixedWord(heard, word)) applyVocabularyToTranscript();
  },

  setLanguage(code: string): void {
    setLanguageOverride(code);
  },

  enableBrowserASR(): void {
    enableBrowserASR();
  },

  disableBrowserASR(): void {
    disableBrowserASR();
  },

  subscribeLevels(cb: (l: Levels) => void): () => void {
    return storeSubscribeLevels(cb);
  },

  listMicDevices,
};

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => {
    void meeting.release().catch(() => {});
  });
}
