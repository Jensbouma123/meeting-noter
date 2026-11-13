export type ResumeDecision = 'skip' | 'restart' | 'resume';

export interface PartialFileState {
  loadedBytes: number;
  totalBytes: number;
  etag: string | null;
}

export interface FreshFileMeta {
  totalBytes: number;
  etag: string | null;
}
