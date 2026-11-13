import type { AsrModelManifest } from '../types/model-manifest';
import type { ModelDownloadProgress } from '../types/download-progress';
import { ensureHfFileCached } from './hf-file-download';
import { categorizeManifestFile } from './manifest-file-role';

export async function downloadParakeetModelResumable(
  manifest: AsrModelManifest,
  onProgress?: (p: ModelDownloadProgress) => void,
  onCacheWarning?: (message: string) => void,
): Promise<void> {
  for (const file of manifest.files) {
    const role = categorizeManifestFile(file);
    if (role === 'unknown') {
      console.warn(`[resumable-download] Unrecognized manifest file "${file}".`);
    }
    await ensureHfFileCached(manifest.modelRepo, file, 'main', {
      onProgress: (p) => onProgress?.(p),
      onCacheWarning,
      urlOverride: manifest.fileUrlOverrides?.[file],
    });
  }
}
