import { recordConsent } from '@/lib/asr/browser';
import { readPersistedConsent } from '@/lib/asr/browser/model-registry-persistence';
import { registryState } from '@/lib/asr/browser/model-registry-state';

export function acceptEvalModels(keys: readonly string[]): void {
  const accepted = (c: { choice: string | null; acceptedModels: string[] } | null) =>
    c?.choice === 'accepted' ? c.acceptedModels : [];
  const merged = new Set([
    ...accepted(registryState.persistedConsent),
    ...accepted(readPersistedConsent()),
    ...keys,
  ]);
  recordConsent('accepted', [...merged]);
}
