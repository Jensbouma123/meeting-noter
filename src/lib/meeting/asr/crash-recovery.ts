import {
  forceWasmBackend,
  openDialog,
  registerDefaultModels,
  resetConsent,
} from '@/lib/asr/browser';
import { getAsrModelFamily, setAsrModelFamily, type AsrModelFamily } from '@/lib/asr/browser/model-family';
import { isPostStopTranscriptionRunning } from '../post-stop-progress';
import { SMALL_MODEL_AFTER_CRASH_DESCRIPTION } from './constants';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { clearLoadFailure, resetModelFlags, setBlockedReason } from './state-updates';
import { clearLoadMarker } from './load-marker';
import { clearInitProgress } from './progress-update';

export function didPreviousModelLoadCrash(): boolean {
  return asrState.previousLoadCrashed;
}

export function retryCrashedLoadWithSmallerModel(): void {
  forceWasmBackend();
  registerDefaultModels('wasm', SMALL_MODEL_AFTER_CRASH_DESCRIPTION);
  resetConsent();
  asrState.previousLoadCrashed = false;
  clearLoadMarker();
  clearLoadFailure();
  setBlockedReason(null);
  openDialog();
  notifyBrowserListeners();
}

export function selectSpeechModel(family: AsrModelFamily): boolean {
  if (getAsrModelFamily() === family) return true;
  if (asrState.recordingMode !== null || isPostStopTranscriptionRunning() || asrState.enginePromise !== null) {
    return false;
  }
  setAsrModelFamily(family);
  if (asrState.engine) {
    asrState.engine.disable();
    asrState.engine = null;
  }
  resetModelFlags();
  setBlockedReason(null);
  clearInitProgress();
  if (asrState.activeBackend !== null) registerDefaultModels(asrState.activeBackend);
  notifyBrowserListeners();
  return true;
}

export function promptBrowserASRDownload(): void {
  openDialog();
}
