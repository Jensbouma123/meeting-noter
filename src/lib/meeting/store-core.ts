import { INITIAL_STATE } from './initial-state';
import type { MeetingState } from './types';

let state: MeetingState = { ...INITIAL_STATE, segments: [], speakers: {} };
let frameQueued = false;
let microtaskQueued = false;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  frameQueued = false;
  microtaskQueued = false;
  for (const fn of listeners) fn();
}

// Hidden tabs never run requestAnimationFrame, so a frame-batched emit would
// stall autosave and every store subscriber until the tab is shown again.
function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function emit(): void {
  if (typeof requestAnimationFrame === 'undefined') {
    notifyListeners();
    return;
  }
  if (pageHidden()) {
    if (microtaskQueued) return;
    microtaskQueued = true;
    queueMicrotask(notifyListeners);
    return;
  }
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    if (frameQueued) notifyListeners();
  });
}

export function getState(): MeetingState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setState(partial: Partial<MeetingState>): void {
  state = { ...state, ...partial };
  emit();
}
