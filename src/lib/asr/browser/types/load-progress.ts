export interface BrowserASRLoadProgress {
  stage: 'files' | 'fetch' | 'session' | 'warmup';
  done: number;
  total: number;
  loadedBytes?: number;
  totalBytes?: number;
  file?: string;
}
