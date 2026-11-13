import { UPDATE_DISMISSED_KEY } from './constants';
import type { UpdateSnapshot } from './types';

export const INITIAL_SNAPSHOT: UpdateSnapshot = {
  status: 'idle',
  info: null,
  dismissedVersion: null,
  applyStatus: null,
};

let snapshot = INITIAL_SNAPSHOT;
export const listeners = new Set<() => void>();

export function publish(next: UpdateSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getUpdateSnapshot(): UpdateSnapshot {
  return snapshot;
}

export function readDismissedVersion(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(UPDATE_DISMISSED_KEY);
  } catch {
    return null;
  }
}
