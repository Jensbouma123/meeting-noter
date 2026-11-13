import { registryState } from './model-registry-state';
import type { ConsentState, ModelEntry, RegistryState } from './types/model-registry';

const SERVER_SNAPSHOT: RegistryState = Object.freeze({
  entries: Object.freeze({}) as Record<string, ModelEntry>,
  dialogVisible: false,
  consentState: Object.freeze({
    decidedAt: null,
    choice: null,
    acceptedModels: Object.freeze([]) as unknown as string[],
  }) as ConsentState,
  activeBackend: null,
});

function shouldShowDialog(): boolean {
  const { dialogVisible, persistedConsent, entries } = registryState;
  if (dialogVisible !== null) return dialogVisible;
  if (persistedConsent === null || persistedConsent.decidedAt === null) return true;
  if (persistedConsent.choice === 'declined') return false;
  return !Object.values(entries).every(
    (e) => e.status === 'cached' || e.status === 'unavailable',
  );
}

export function getState(): RegistryState {
  if (registryState.cachedSnapshot === null) {
    registryState.cachedSnapshot = {
      entries: registryState.entries,
      dialogVisible: shouldShowDialog(),
      consentState: registryState.persistedConsent,
      activeBackend: registryState.activeBackend,
    };
  }
  return registryState.cachedSnapshot;
}

export function getServerSnapshot(): RegistryState {
  return SERVER_SNAPSHOT;
}
