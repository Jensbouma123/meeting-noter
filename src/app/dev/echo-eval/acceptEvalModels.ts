import { recordConsent } from '@/lib/asr/browser';
import { readPersistedConsent } from '@/lib/asr/browser/model-registry-persistence';
import { registryState } from '@/lib/asr/browser/model-registry-state';

// Dev eval only: accepts the download for `keys` without the consent prompt. It merges with the
// models already accepted (in memory and in localStorage, which every shard frame shares), so the
// ASR and diarizer acceptances, or two frames, never overwrite each other.
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
