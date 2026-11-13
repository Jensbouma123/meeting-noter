import type { AsrModelFamily } from './types/model-family';

export type { AsrModelFamily } from './types/model-family';

export const ASR_MODEL_FAMILIES: readonly AsrModelFamily[] = Object.freeze(['parakeet', 'nemotron']);

export const DEFAULT_ASR_MODEL_FAMILY: AsrModelFamily = 'parakeet';

const STORAGE_KEY = 'meeting-noter:asr-model-family';

let family: AsrModelFamily | null = null;
const listeners = new Set<() => void>();

function isFamily(value: unknown): value is AsrModelFamily {
  return typeof value === 'string' && (ASR_MODEL_FAMILIES as readonly string[]).includes(value);
}

function readStored(): AsrModelFamily | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return isFamily(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function getAsrModelFamily(): AsrModelFamily {
  family ??= readStored() ?? DEFAULT_ASR_MODEL_FAMILY;
  return family;
}

export function getServerAsrModelFamily(): AsrModelFamily {
  return DEFAULT_ASR_MODEL_FAMILY;
}

function storeFamilyBestEffort(next: AsrModelFamily): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
  } catch {
    return;
  }
}

export function setAsrModelFamily(next: AsrModelFamily): void {
  if (getAsrModelFamily() === next) return;
  family = next;
  storeFamilyBestEffort(next);
  for (const fn of listeners) fn();
}

export function subscribeAsrModelFamily(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetAsrModelFamilyForTests(): void {
  family = null;
  listeners.clear();
}
