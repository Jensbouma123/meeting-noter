import type { CachedFileProbe, ModelCacheState } from '../types/download-cache-state';
import type { AsrModelManifest } from '../model-manifest';
import { isModelFileCached } from './cached-files';

type ManifestFiles = Pick<AsrModelManifest, 'modelRepo' | 'files'>;

export async function probeCachedModelFiles(
  manifest: ManifestFiles,
  onProgress?: (probe: CachedFileProbe) => void,
  revision = 'main',
): Promise<void> {
  for (const [index, file] of manifest.files.entries()) {
    const cached = await isModelFileCached(manifest.modelRepo, file, revision);
    onProgress?.({ done: index + 1, total: manifest.files.length, file, cached });
  }
}

export async function areModelFilesCached(
  manifest: ManifestFiles,
  revision = 'main',
): Promise<ModelCacheState> {
  let cached = 0;
  for (const file of manifest.files) {
    if (await isModelFileCached(manifest.modelRepo, file, revision)) cached += 1;
  }
  const total = manifest.files.length;
  return { cached, total, complete: total > 0 && cached === total };
}
