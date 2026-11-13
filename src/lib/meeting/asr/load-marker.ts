import { ASR_LOAD_MARKER_KEY, LOAD_MARKER_MAX_AGE_MS } from './constants';
import { asrState } from './state';

export function readLoadMarker(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const value = sessionStorage.getItem(ASR_LOAD_MARKER_KEY);
    if (value === null) return false;
    const startedAt = Number(value);
    if (Number.isFinite(startedAt) && Date.now() - startedAt > LOAD_MARKER_MAX_AGE_MS) {
      sessionStorage.removeItem(ASR_LOAD_MARKER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markLoadInProgress(): void {
  asrState.ownsLoadMarker = true;
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(ASR_LOAD_MARKER_KEY, String(Date.now()));
  } catch {
    return;
  }
}

export function clearLoadMarker(): void {
  asrState.ownsLoadMarker = false;
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(ASR_LOAD_MARKER_KEY);
  } catch {
    return;
  }
}
