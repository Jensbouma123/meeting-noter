export interface DownloadProgress {
  loaded: number;
  total: number;
  file: string;
  resuming: boolean;
}

export interface DownloadFileOptions {
  onProgress?: (p: DownloadProgress) => void;
  onCacheWarning?: (message: string) => void;
  urlOverride?: string;
}

export interface ModelDownloadProgress {
  loaded: number;
  total: number;
  file: string;
  resuming: boolean;
}
