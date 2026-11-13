import { useSyncExternalStore } from 'react';
import { addFixedWord } from '@/lib/vocabulary/store';
import { disposeSharedEmbedder } from '@/lib/semantic-search/service';
import { disableBrowserASR, enableBrowserASR } from './browser-asr';
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
export {
  enableBrowserASR,
  disableBrowserASR,
  resetBrowserASR,
  getBrowserASREnabled,
  getBrowserASRReady,
  getBrowserASRLoading,
  getBrowserASRFailed,
  getBrowserASRError,
  getBrowserASRPhase,
  getBrowserASRStatusMessage,
  getBrowserASRProgress,
  getServerBrowserASRProgress,
  ensureBrowserASRReady,
  promptBrowserASRDownload,
  didPreviousModelLoadCrash,
  retryCrashedLoadWithSmallerModel,
  subscribeBrowserASR,
  warmBrowserASR,
  setSpeakerLabeler,
  resolveAsrBackend,
  isPostStopTranscriptionOnly,
  isPostStopTranscriptionRunning,
  transcribeRecordedAudioAfterStop,
  getPostStopTranscriptionProgress,
  POST_STOP_MESSAGE,
  type BrowserASRProgress,
  type SpeakerLabeler,
} from './browser-asr';
export { getServerPostStopProgress, subscribePostStopTranscription } from './post-stop-progress';
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
