import type { BrowserErrorKind } from '../types/asr-state';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';

export function clearLoadFailure(): void {
  asrState.failed = false;
  asrState.error = null;
  asrState.errorKind = null;
}

export function resetModelFlags(): void {
  asrState.loading = false;
  asrState.ready = false;
  clearLoadFailure();
}

export function recordFailure(kind: BrowserErrorKind, message: string): void {
  asrState.failed = true;
  asrState.errorKind = kind;
  asrState.error = message;
}

export function setBlockedReason(reason: string | null): void {
  if (asrState.blockedReason === reason) return;
  asrState.blockedReason = reason;
  notifyBrowserListeners();
}
