import type { CachedFileProbe, ModelCacheState } from '../types/download-cache-state';
import type { ManifestFiles } from '../types';
import { isModelFileCachedByKey } from './cached-files';
import { resolveCacheKey } from './revision-pin';

async function isFileCached(manifest: ManifestFiles, file: string, revision: string): Promise<boolean> {
  const key = await resolveCacheKey(manifest.modelRepo, revision, file, manifest.fileUrlOverrides?.[file]);
  return isModelFileCachedByKey(key);
}

export async function probeCachedModelFiles(
  manifest: ManifestFiles,
  onProgress?: (probe: CachedFileProbe) => void,
  revision = 'main',
): Promise<void> {
  for (const [index, file] of manifest.files.entries()) {
    const cached = await isFileCached(manifest, file, revision);
    onProgress?.({ done: index + 1, total: manifest.files.length, file, cached });
  }
}

export async function areModelFilesCached(manifest: ManifestFiles, revision = 'main'): Promise<ModelCacheState> {
  let cached = 0;
  for (const file of manifest.files) {
    if (await isFileCached(manifest, file, revision)) cached += 1;
  }
  const total = manifest.files.length;
  return { cached, total, complete: total > 0 && cached === total };
}
