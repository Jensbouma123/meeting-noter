import type { ModelDownloadProgress } from '../resumable-download';

export type DownloadHandler = (onProgress: (p: ModelDownloadProgress) => void) => Promise<void>;
