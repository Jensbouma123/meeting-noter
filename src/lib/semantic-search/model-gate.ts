import { SEARCH_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';
import { getState } from '@/lib/asr/browser/model-registry-snapshot';
import { subscribeRegistry } from '@/lib/asr/browser/model-registry-state';

export function isSearchModelReady(): boolean {
  return getState().entries[SEARCH_REGISTRY_KEY]?.status === 'cached';
}

export function onSearchModelReady(fn: () => void): () => void {
  let ready = isSearchModelReady();
  return subscribeRegistry(() => {
    const now = isSearchModelReady();
    if (now && !ready) fn();
    ready = now;
  });
}
