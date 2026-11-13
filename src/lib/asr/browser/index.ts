export { BrowserASREngine } from './parakeet';
export { createBrowserASREngine } from './engine-client';
export type {
  AsrEngine,
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRLoadProgress,
  BrowserASRStatus,
  BrowserASRPhase,
  BrowserSegment,
  BrowserLanguageInfo,
  BrowserTranscribeResult,
  BrowserRecognizeResult,
  BrowserWord,
} from './types';
export { configFromManifest } from './config-from-manifest';
export { DEFAULT_BROWSER_ASR_CONFIG, BROWSER_ASR_LANGUAGE_NAMES } from './constants';
export {
  INIT_STAGE_LABELS,
  INIT_STAGE_WEIGHTS,
  currentInitStage,
  describeInitStage,
  downloadProgressPercent,
  emptyInitProgress,
  formatModelProgressLabel,
  initProgressPercent,
  type InitProgress,
  type InitStage,
  type ModelProgressStage,
} from './model-progress';
export { subscribeRegistry, notifyListeners } from './model-registry-state';
export { getState, getServerSnapshot } from './model-registry-snapshot';
export { registerModel, registerManifest, registerDefaultModels, initRegistry, getModelStatus } from './model-registry-register';
export { setActiveBackend, setDialogVisible, openDialog, closeDialog } from './model-registry-dialog';
export { markCached, markNotCached, markFailed, markCancelled, markUnavailable, setEstimatedSize, resetAllEntries } from './model-registry-status';
export { updateProgress } from './model-registry-progress';
export { recordConsent, resetConsent, isConsentGiven, hasNeverBeenPrompted } from './model-registry-consent';
export type { ModelEntry, ModelEntryConfig, ModelStatus, ModelProgress, ConsentChoice, ConsentState } from './types/model-registry';
export type { AsrBackend } from './types/model-manifest';
export { PARAKEET_TDT_V3, PARAKEET_TDT_V3_WEBGPU, PARAKEET_TDT_V3_WEBGPU_FP16, PARAKEET_TDT_V3_WASM, FP16_ENCODER_URL, Q4F16_ENCODER_URL } from './model-manifest-parakeet';
export { WEBGPU_ENCODER_FALLBACKS, asrManifestFallbackOrder, manifestForBackend, webgpuManifestForEncoder, webgpuEncoderOf, nextWebgpuEncoder, hubOptionsFor } from './model-manifest-selection';
export { probeModelSize } from './model-manifest-size-probe';
export type { AsrModelManifest, EncoderQuant, WebgpuEncoderQuant } from './types/model-manifest';
export {
  detectAsrBackend,
  activeAsrManifest,
  activeWebgpuEncoder,
  forceNextWebgpuEncoder,
  forceWasmBackend,
  resetAsrBackendDetectionForTests,
} from './backend-detect';
export { isSafariEngine } from './is-safari-engine';
export {
  getBrowserASRDownloadManager,
  initiateDownloads,
  cancelDownloads,
  retryDownload,
  autoResumeConsentedDownloads,
  deleteDownloadedModels,
  probeRegisteredModelSizes,
  getRegisteredModels,
  registerDownloadHandler,
  formatBytes,
  formatSeconds,
} from './browser-asr-download-manager';
export {
  probeCachedModelFiles,
  areModelFilesCached,
  closeModelCacheConnections,
  deleteModelCache,
  abortInFlightDownloads,
  isDownloadCancelled,
  type CachedFileProbe,
  type DeleteModelCacheResult,
  type ModelCacheState,
} from './resumable-download';
