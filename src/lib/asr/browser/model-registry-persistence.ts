import { registryState } from './model-registry-state';
import type { ConsentState, ModelEntry } from './types/model-registry';

const CONSENT_STORAGE_KEY = 'mn.model-consent.v1';
const REGISTRY_STORAGE_KEY = 'mn.model-registry.v1';

export function readPersistedConsent(): ConsentState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function persistConsent(state: ConsentState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

export function clearPersistedConsent(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    return true;
  }
  return true;
}

export function readPersistedEntries(): Record<string, ModelEntry> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, Omit<ModelEntry, 'isReady'>> = JSON.parse(raw);
    const result: Record<string, ModelEntry> = {};
    for (const key of Object.keys(parsed)) {
      const entry = parsed[key];
      result[key] = {
        ...entry,
        status: entry.status === 'downloading' ? 'not-downloaded' : entry.status,
        progress: entry.progress ? { ...entry.progress, resuming: false } : entry.progress,
        isReady: entry.status === 'cached',
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function persistEntries(): void {
  registryState.lastProgressPersistAt = Date.now();
  try {
    if (typeof localStorage === 'undefined') return;
    const serializable: Record<string, Pick<ModelEntry, Exclude<keyof ModelEntry, 'isReady'>>> = {};
    for (const [key, entry] of Object.entries(registryState.entries)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isReady, ...rest } = entry as ModelEntry;
      serializable[key] = rest as Pick<ModelEntry, Exclude<keyof ModelEntry, 'isReady'>>;
    }
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    return;
  }
}
