import { allManifests } from './model-manifest-selection';

export const DIARIZATION_REGISTRY_KEY = 'diarization-turns';
export const LANGID_REGISTRY_KEY = 'langid-whisper-tiny';
export const SEARCH_REGISTRY_KEY = 'search-embeddinggemma2';

export function knownModelKeys(): ReadonlySet<string> {
  return new Set([
    ...allManifests().map((manifest) => manifest.key),
    DIARIZATION_REGISTRY_KEY,
    LANGID_REGISTRY_KEY,
    SEARCH_REGISTRY_KEY,
  ]);
}
