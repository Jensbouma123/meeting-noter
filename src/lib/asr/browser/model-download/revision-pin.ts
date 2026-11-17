import type { RevisionPinRecord, ShaLookup } from '../types/download-cache-records';
import { deleteMetaRecord, getMetaRecord, putMetaRecord } from './cache-primitives';
import { cacheKey, deleteCachedFile } from './cached-files';
import { FILE_STORE, REVISION_PIN_TIMEOUT_MS } from './constants';

const SHA_PATTERN = /^[0-9a-f]{64}$/i;

async function lookupSha(url: string): Promise<ShaLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVISION_PIN_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}.sha256`, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return { kind: 'missing' };
    const sha = (await res.text()).trim().split(/\s+/)[0] ?? '';
    return SHA_PATTERN.test(sha) ? { kind: 'sha', sha: sha.toLowerCase() } : { kind: 'missing' };
  } catch {
    return { kind: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

function pinnedRevision(revision: string, sha: string): string {
  return `${revision}-sha-${sha.slice(0, 16)}`;
}

function pointerKey(baseKey: string): string {
  return `revision-pin--${baseKey}`;
}

async function readPointer(baseKey: string): Promise<RevisionPinRecord | undefined> {
  return getMetaRecord<RevisionPinRecord>(FILE_STORE, pointerKey(baseKey)).catch(() => undefined);
}

export async function resolveCacheKey(
  repoId: string,
  revision: string,
  filename: string,
  urlOverride: string | undefined,
): Promise<string> {
  const baseKey = cacheKey(repoId, revision, filename);
  if (!urlOverride) return baseKey;

  const found = await lookupSha(urlOverride);
  const pointer = await readPointer(baseKey);
  if (found.kind === 'missing') return baseKey;
  if (found.kind === 'offline') {
    return pointer ? cacheKey(repoId, pinnedRevision(revision, pointer.sha), filename) : baseKey;
  }

  const pinnedKey = cacheKey(repoId, pinnedRevision(revision, found.sha), filename);
  if (pointer?.sha === found.sha) return pinnedKey;

  const staleKey = pointer
    ? cacheKey(repoId, pinnedRevision(revision, pointer.sha), filename)
    : baseKey;
  await deleteCachedFile(staleKey).catch(() => {});
  if (pointer) await deleteMetaRecord(FILE_STORE, pointerKey(baseKey)).catch(() => {});
  await putMetaRecord(FILE_STORE, pointerKey(baseKey), {
    sha: found.sha,
    updatedAt: Date.now(),
  } satisfies RevisionPinRecord).catch(() => {});
  return pinnedKey;
}
