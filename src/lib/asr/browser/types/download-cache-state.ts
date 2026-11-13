export interface DeleteModelCacheResult {
  deleted: boolean;
}

export interface CachedFileProbe {
  done: number;
  total: number;
  file: string;
  cached: boolean;
}

export interface ModelCacheState {
  cached: number;
  total: number;
  complete: boolean;
}

export interface HfTreeEntry {
  path?: unknown;
  size?: unknown;
  oid?: unknown;
  lfs?: { oid?: unknown };
}

export interface RepoFileMeta {
  size: number;
  sha256: string | null;
}
