import './asr/init';

export { PARQUET_REGISTRY_KEY, POST_STOP_MESSAGE, LOW_CONFIDENCE_THRESHOLD, OVERLAP_CLIP_MAX_SECONDS, LIVE_FLUSH_WAIT_MS } from './asr/constants';
export { isWebGPUAvailable, resolveAsrBackend, shouldBufferForPostStop, isPostStopTranscriptionOnly } from './asr/backend';
export {
  beginRecordedAudioCapture,
  bufferRecordedAudio,
  getRecordingTranscriptionMode,
} from './asr/recording-mode';
export { transcribeRecordedAudioAfterStop, getPostStopTranscriptionProgress } from './asr/post-stop-run';
export { isPostStopTranscriptionRunning, getServerPostStopProgress, subscribePostStopTranscription } from './post-stop-progress';
export {
  enableBrowserASR,
  disableBrowserASR,
  getBrowserASRLoading,
  getBrowserASREnabled,
  getBrowserASRReady,
  getBrowserASRFailed,
  getBrowserASRError,
  getBrowserASRErrorKind,
} from './asr/controls';
export { getBrowserASRPhase, getBrowserASRStatusMessage } from './asr/phase';
export { getBrowserASRProgress, getServerBrowserASRProgress } from './asr/progress-build';
export {
  didPreviousModelLoadCrash,
  retryCrashedLoadWithSmallerModel,
  selectSpeechModel,
  promptBrowserASRDownload,
} from './asr/crash-recovery';
export { subscribeBrowserASR } from './asr/listeners';
export { ensureBrowserASRReady, warmBrowserASR } from './asr/engine-acquire';
export { setSpeakerLabeler, setSpeakerTimeline } from './asr/speaker';
export { lowConfidenceSpans } from './asr/low-confidence';
export { pushLiveAudio } from './asr/live-push';
export { getLiveAsrFeed } from './asr/live-feed';
export { flushLiveAudio } from './asr/live-flush';
export { tryBrowserASR } from './asr/try-asr';
export { resetBrowserASR } from './asr/reset';
export {
  initRegistry,
  registerDefaultModels,
  subscribeRegistry,
  getServerSnapshot,
  getModelStatus,
  initiateDownloads,
  markCached,
  type ModelEntry,
} from '@/lib/asr/browser';
export type { BrowserASRProgress } from './types/asr-progress';
export type { SpeakerLabeler, SpeakerTimeline } from './types/asr-speaker';
export type { LiveAsrFeed } from './types/asr-live';
