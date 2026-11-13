import type { DownloadProgress } from './download-progress';
import type { RepoFileMeta } from './download-cache-state';

export interface LeadContext {
  repoId: string;
  filename: string;
  revision: string;
  key: string;
  meta: RepoFileMeta | null;
  wantBytes: boolean;
  onProgress?: (p: DownloadProgress) => void;
  onCacheWarning?: (message: string) => void;
  urlOverride?: string;
  abortGeneration: number;
}

export type BroadcastMsg =
  | { type: 'progress'; key: string; loaded: number; total: number }
  | { type: 'done'; key: string }
  | { type: 'failed'; key: string; message: string };

export interface CacheFailureTracker {
  onWriteFailure: (detail: string) => void;
  count: () => number;
}
