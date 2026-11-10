/** Barrel export for the model download feature.
 *
 * This module exposes the registry, download manager, and React
 * components for model download consent and progress.  The model
 * registry is a module-level observable (no zustan, no localStorage
 * during render) matching the existing meeting-noter patterns.
 *
 * Usage in a page / meeting view:
 *
 *   import { ModelRegistryProvider } from '@/components/models';
 *
 *   // Wrap your meeting view:
 *   <ModelRegistryProvider autoShowDialog={true} />
 *     <MeetingView />
 *   </ModelRegistryProvider>
 *
 * Or as a standalone portal (the dialog will render to document.body):
 *
 *   import { ModelConsentDialog } from '@/components/models';
 *   // The dialog auto-shuts itself based on registry state.
 */

export {
  ModelRegistryProvider,
  useModelCached,
  useModelStatus,
  useAnyDownloading,
  useAnyModelFailed,
} from './ModelRegistryProvider';
export { ModelConsentDialog } from './ModelConsentDialog';
export { SpeechModelSettings } from './SpeechModelSettings';
export {
  ModelPreparationBar,
  describePreparation,
  isPreparing,
  useModelPreparation,
  type ModelPreparationState,
} from './ModelPreparationProgress';

// Re-export registry and download manager from the library barrel.
export {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  registerModel,
  registerDefaultModels,
  initRegistry,
  getModelStatus,
  markCached,
  markNotCached,
  markFailed,
  markCancelled,
  markUnavailable,
  updateProgress,
  recordConsent,
  resetConsent,
  resetAllEntries,
  setDialogVisible,
  notifyListeners,
  initiateDownloads,
  cancelDownloads,
  retryDownload,
  autoResumeConsentedDownloads,
  deleteDownloadedModels,
  getRegisteredModels,
  formatBytes,
  formatSeconds,
  type DeleteModelCacheResult,
  type ModelEntry,
  type ModelEntryConfig,
  type ModelStatus,
  type ModelProgress,
  type ConsentChoice,
  type ConsentState,
} from '@/lib/asr/browser';
