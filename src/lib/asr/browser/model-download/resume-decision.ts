import type { FreshFileMeta, PartialFileState, ResumeDecision } from '../types/download-resume';
import { MAX_HASH_VERIFY_BYTES } from './constants';

export function decideResume(partial: PartialFileState | null, fresh: FreshFileMeta): ResumeDecision {
  if (!partial) return 'restart';
  if (partial.totalBytes !== fresh.totalBytes) return 'restart';
  if (partial.etag !== null && fresh.etag !== null && partial.etag !== fresh.etag) return 'restart';
  if (partial.loadedBytes <= 0) return 'restart';
  if (partial.loadedBytes >= fresh.totalBytes) return 'restart';
  return 'resume';
}

export function isSizeValid(actualBytes: number, expectedBytes: number): boolean {
  return Number.isFinite(actualBytes) && actualBytes === expectedBytes;
}

export function shouldVerifyHash(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_HASH_VERIFY_BYTES;
}
