import { INITIAL_STATE } from './initial-state';
import type { MeetingState } from './types';

let state: MeetingState = { ...INITIAL_STATE, segments: [], speakers: {} };
let emitQueued = false;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

export function emit(): void {
  if (emitQueued) return;
  emitQueued = true;
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      emitQueued = false;
      notifyListeners();
    });
  } else {
    emitQueued = false;
    notifyListeners();
  }
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
