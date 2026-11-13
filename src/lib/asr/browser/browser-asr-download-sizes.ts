import { manifestForBackend, manifestForVariant, probeModelSize } from './model-manifest';
import { getState, setEstimatedSize } from './model-registry';
import type { ModelEntry } from './model-registry';
import { sizeProbes } from './browser-asr-download-state';

export function manifestForEntry(entry: Pick<ModelEntry, 'backend' | 'variant'>) {
  return manifestForVariant(entry.variant) ?? manifestForBackend(entry.backend);
}

export async function probeRegisteredModelSizes(): Promise<void> {
  const entries = Object.values(getState().entries);
  await Promise.all(
    entries.map(async (entry) => {
      if ((entry.kind ?? 'asr') !== 'asr') return;
      const manifest = manifestForEntry(entry);
      if (entry.modelRepo !== manifest.modelRepo) return;
      const existing = sizeProbes.get(entry.key);
      if (existing) return existing;

      const probe = probeModelSize(manifest)
        .then((size) => {
          if (size !== null) setEstimatedSize(entry.key, size);
        })
        .catch(() => undefined)
        .finally(() => {
          sizeProbes.delete(entry.key);
        });
      sizeProbes.set(entry.key, probe);
      return probe;
    })
  );
}
