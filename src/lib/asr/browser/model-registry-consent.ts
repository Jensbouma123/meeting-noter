import { clearPersistedConsent, persistConsent, persistEntries } from './model-registry-persistence';
import { markCancelled } from './model-registry-status';
import { emptyProgress, notifyListeners, patchEntry, registryState } from './model-registry-state';

const declineListeners = new Set<() => void>();

export function onConsentDeclined(fn: () => void): () => void {
  declineListeners.add(fn);
  return () => {
    declineListeners.delete(fn);
  };
}

export function recordConsent(choice: 'accepted' | 'declined', keys: string[]): void {
  registryState.persistedConsent = {
    decidedAt: Date.now(),
    choice,
    acceptedModels: choice === 'accepted' ? keys : [],
  };
  persistConsent(registryState.persistedConsent);
  if (choice === 'declined') {
    for (const key of Object.keys(registryState.entries)) {
      if (registryState.entries[key].status === 'downloading') markCancelled(key);
    }
    for (const fn of declineListeners) fn();
  }
  notifyListeners();
}

export function isConsentGiven(key: string): boolean {
  const consent = registryState.persistedConsent;
  if (consent === null) return false;
  if (consent.choice !== 'accepted') return false;
  return consent.acceptedModels.includes(key);
}

export function hasNeverBeenPrompted(): boolean {
  return registryState.persistedConsent === null;
}

export function resetConsent(): void {
  registryState.persistedConsent = null;
  if (!clearPersistedConsent()) return;
  for (const [key, entry] of Object.entries(registryState.entries)) {
    if (entry.status !== 'cached' && entry.status !== 'unavailable') {
      patchEntry(key, {
        status: 'not-downloaded',
        error: null,
        wasCancelled: false,
        isReady: false,
        progress: emptyProgress(entry.estimatedSizeBytes),
      });
    }
  }
  notifyListeners();
  persistEntries();
}
