import type { CachedFile, CachedFileRecord } from '../types/download-cache-records';
import {
  deleteChunksFrom,
  deleteMetaRecord,
  getChunks,
  getMetaRecord,
} from './cache-primitives';
import { FILE_STORE, PARTIAL_STORE } from './constants';

export function cacheKey(repoId: string, revision: string, filename: string): string {
  return `hf-${repoId}-${revision}--${filename}`;
}

export async function deleteCachedFile(key: string): Promise<void> {
  await Promise.all([
    deleteChunksFrom(key, 0),
    deleteMetaRecord(FILE_STORE, key).catch(() => {}),
    deleteMetaRecord(PARTIAL_STORE, key).catch(() => {}),
  ]);
}

export async function readCachedFile(key: string): Promise<CachedFile | null> {
  const record = await getMetaRecord<CachedFileRecord>(FILE_STORE, key);
  if (!record) return null;
  const parts = await getChunks(key, record.chunkCount);
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  if (parts.some((part) => part.byteLength === 0) || total !== record.size) {
    console.warn(
      `[resumable-download] Cached "${key}" is incomplete on disk (${total} of ${record.size} bytes) ` +
        '— treating it as not cached.',
    );
    await deleteCachedFile(key);
    return null;
  }
  return { record, parts };
}

export async function isModelFileCachedByKey(key: string): Promise<boolean> {
  try {
    return (await getMetaRecord<CachedFileRecord>(FILE_STORE, key)) != null;
  } catch {
    return false;
  }
}

export function isModelFileCached(
  repoId: string,
  filename: string,
  revision: string,
): Promise<boolean> {
  return isModelFileCachedByKey(cacheKey(repoId, revision, filename));
}
