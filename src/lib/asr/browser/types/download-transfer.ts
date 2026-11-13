import type { ChunkWriter } from '../model-download/chunk-writer';
import type { StallGuard } from './download-stall';
import type { BroadcastMsg } from './download-lead';
import type { DownloadProgress } from './download-progress';
import type { RepoFileMeta } from './download-cache-state';

export interface TransferArgs {
  url: string;
  filename: string;
  key: string;
  meta: RepoFileMeta | null;
  wantBytes: boolean;
  guard: StallGuard;
  aborter: AbortController;
  channel: BroadcastChannel | null;
  onProgress?: (p: DownloadProgress) => void;
  onWriteFailure: (detail: string) => void;
}

export interface TransferResult {
  writer: ChunkWriter;
  totalBytes: number;
  resuming: boolean;
  verifyHash: boolean;
}

export interface BodyStreamArgs {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  writer: ChunkWriter;
  guard: StallGuard;
  channel: BroadcastChannel | null;
  key: string;
  filename: string;
  totalBytes: number;
  startByte: number;
  resuming: boolean;
  onProgress?: (p: DownloadProgress) => void;
}

export type { BroadcastMsg };
