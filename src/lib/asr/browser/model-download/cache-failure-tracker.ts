import type { CacheFailureTracker } from '../types/download-lead';

export function createCacheFailureTracker(filename: string): CacheFailureTracker {
  let failures = 0;
  return {
    onWriteFailure: (detail) => {
      failures += 1;
      if (failures > 1) return;
      console.error(
        `[resumable-download] Could not write "${filename}" to the model cache: ${detail}. ` +
          'The download continues; the model will be downloaded again next time it is needed.',
      );
    },
    count: () => failures,
  };
}
