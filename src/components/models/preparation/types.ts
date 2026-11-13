import type { BrowserASRProgress } from '@/lib/meeting/types/asr-progress';
import type { ModelEntry } from '@/lib/asr/browser';

export interface ModelPreparationState {
  asrEntry: ModelEntry | undefined;
  downloadPercent: number | null;
  downloadLoadedBytes: number;
  downloadTotalBytes: number;
  engine: BrowserASRProgress;
  snapshot: { registry: unknown; engine: BrowserASRProgress };
}

export interface ParsedDownloadError {
  summary: string;
  filename: string | null;
}
