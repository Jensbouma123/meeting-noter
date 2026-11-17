import type { AutosaveInput } from './types/autosave';
import { AUTOSAVE_KEY, writeAutosavePointer } from './autosave-slot';
import { loadSessionTranscript, saveSessionTranscript } from './session-transcript-storage';
import { queueLiveSync } from './live-sync';
import { queueMeetingSync } from './sync-queue';
import { isStorageAvailable } from './storage-available';
import { isCaptureActive } from './transcript-session';
import { recordTranscript, transcriptChanged } from './transcript-revision';

export { AUTOSAVE_KEY, loadAutosavedSession } from './autosave-slot';
export const AUTOSAVE_THROTTLE_MS = 1000;

let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInput: AutosaveInput | null = null;

export function saveAutosavedSession(input: AutosaveInput): void {
  if (!isStorageAvailable()) return;
  const capturing = isCaptureActive();
  const changed = !capturing && transcriptChanged(input, () => loadSessionTranscript(input.sessionId));
  if (!saveSessionTranscript(input)) return;
  writeAutosavePointer(input.sessionId);
  recordTranscript(input, changed);
  if (capturing) queueLiveSync(input.sessionId);
  else if (changed) queueMeetingSync(input.sessionId);
}

function flushPending(): void {
  throttleTimer = null;
  const input = pendingInput;
  pendingInput = null;
  if (input) saveAutosavedSession(input);
}

export function scheduleAutosave(input: AutosaveInput): void {
  try {
    pendingInput = input;
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(flushPending, AUTOSAVE_THROTTLE_MS);
  } catch {
    try {
      saveAutosavedSession(input);
    } catch {
      return;
    }
  }
}

export function cancelPendingAutosave(sessionId: string): void {
  if (pendingInput?.sessionId !== sessionId) return;
  if (throttleTimer !== null) clearTimeout(throttleTimer);
  throttleTimer = null;
  pendingInput = null;
}

export function flushAutosave(): void {
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      flushPending();
    }
  } catch {
    return;
  }
}

export function dropPendingAutosave(): void {
  try {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
  } catch {
    pendingInput = null;
  }
  pendingInput = null;
}

export function clearAutosavedSession(): void {
  dropPendingAutosave();
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    return;
  }
}
