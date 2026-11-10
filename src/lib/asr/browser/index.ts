export { BrowserASREngine } from './parakeet';
export { createBrowserASREngine, type AsrEngine } from './engine-client';
export type {
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
export { DEFAULT_BROWSER_ASR_CONFIG, BROWSER_ASR_LANGUAGE_NAMES, configFromManifest } from './types';

// Model-preparation progress arithmetic (pure; no browser APIs).
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

// Model download registry (state management + persistence).
export {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  registerModel,
  registerManifest,
  registerDefaultModels,
  setActiveBackend,
  initRegistry,
  getModelStatus,
  markCached,
  markNotCached,
  markFailed,
  markCancelled,
  markUnavailable,
  updateProgress,
  setEstimatedSize,
  recordConsent,
  resetConsent,
  resetAllEntries,
  setDialogVisible,
  openDialog,
  closeDialog,
  notifyListeners,
  isConsentGiven,
  hasNeverBeenPrompted,
  type ModelEntry,
  type ModelEntryConfig,
  type ModelStatus,
  type ModelProgress,
  type ConsentChoice,
  type ConsentState,
  type AsrBackend,
} from './model-registry';

// Model manifest — the single source of truth for repo + quantisation.
export {
  PARAKEET_TDT_V3,
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
  PARAKEET_TDT_V3_WASM,
  WEBGPU_ENCODER_FALLBACKS,
  asrManifestFallbackOrder,
  manifestForBackend,
  webgpuManifestForEncoder,
  webgpuEncoderOf,
  nextWebgpuEncoder,
  FP16_ENCODER_URL,
  Q4F16_ENCODER_URL,
  hubOptionsFor,
  probeModelSize,
  type AsrModelManifest,
  type EncoderQuant,
  type WebgpuEncoderQuant,
} from './model-manifest';

// Backend detection (WebGPU adapter probe + runtime fallback).
export {
  detectAsrBackend,
  activeAsrManifest,
  activeWebgpuEncoder,
  forceNextWebgpuEncoder,
  forceWasmBackend,
  isSafariEngine,
  resetAsrBackendDetectionForTests,
} from './backend-detect';

// Model download manager (parakeet.js integration).
// Re-exports the download functions (types already exported from model-registry above).
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

// Resumable downloader — also the cache probe the load path measures with,
// and the owner of the IndexedDB databases (including their teardown).
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
