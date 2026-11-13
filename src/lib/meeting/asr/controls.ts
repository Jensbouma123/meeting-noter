import { setOverlapTranscriber } from '../overlap-retranscribe';
import { clearPostStopCapture } from '../post-stop-buffer';
import type { BrowserErrorKind } from '../types/asr-state';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { resetModelFlags } from './state-updates';
import { clearInitProgress } from './progress-update';
import { dropUndecidedFrames } from './recording-mode';
import { recognizeOverlapClip } from './overlap-clip';

export function enableBrowserASR(): void {
  asrState.enabled = true;
  setOverlapTranscriber(recognizeOverlapClip);
  notifyBrowserListeners();
}

export function disableBrowserASR(): void {
  asrState.enabled = false;
  setOverlapTranscriber(null);
  if (asrState.engine) {
    asrState.engine.disable();
    asrState.engine = null;
  }
  resetModelFlags();
  asrState.blockedReason = null;
  clearInitProgress();
  clearPostStopCapture();
  dropUndecidedFrames();
  notifyBrowserListeners();
}

export function getBrowserASRLoading(): boolean {
  return asrState.loading;
}

export function getBrowserASREnabled(): boolean {
  return asrState.enabled;
}

export function getBrowserASRReady(): boolean {
  return asrState.ready;
}

export function getBrowserASRFailed(): boolean {
  return asrState.failed;
}

export function getBrowserASRError(): string | null {
  return asrState.error;
}

export function getBrowserASRErrorKind(): BrowserErrorKind | null {
  return asrState.errorKind;
}
