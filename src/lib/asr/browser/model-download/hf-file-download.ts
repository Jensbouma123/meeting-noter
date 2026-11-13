import type { DownloadFileOptions } from '../types/download-progress';
import { acquireHfFile } from './acquire-file';

export function downloadHfFileResumable(
  repoId: string,
  filename: string,
  revision = 'main',
  options: DownloadFileOptions = {},
): Promise<string> {
  return acquireHfFile(repoId, filename, revision, options, true).then((url) => {
    if (url === null) {
      throw new Error(`Failed to obtain ${filename} for ${repoId}.`);
    }
    return url;
  });
}

export function ensureHfFileCached(
  repoId: string,
  filename: string,
  revision = 'main',
  options: DownloadFileOptions = {},
): Promise<void> {
  return acquireHfFile(repoId, filename, revision, options, false).then(() => undefined);
}
