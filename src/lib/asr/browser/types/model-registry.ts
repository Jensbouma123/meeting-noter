import type { AsrBackend } from './model-manifest';
import type { ManifestRuntimeOptions } from './model-manifest';

export type ModelStatus =
  | 'not-downloaded'
  | 'downloading'
  | 'cached'
  | 'failed'
  | 'cancelled'
  | 'unavailable';

export interface ModelProgress {
  loadedBytes: number;
  totalBytes: number;
  currentFile: string;
  throughputBytesPerSec: number;
  etaSeconds: number;
  percent: number;
  resuming?: boolean;
}

export interface ModelEntryConfig {
  key: string;
  modelRepo: string;
  displayName: string;
  estimatedSizeBytes: number;
  description?: string;
  fromHubOptions?: ManifestRuntimeOptions;
  preCheckCache?: boolean;
  backend: AsrBackend;
  variant?: string;
  kind?: string;
}

export interface ModelEntry extends ModelEntryConfig {
  status: ModelStatus;
  progress: ModelProgress;
  error: string | null;
  wasCancelled: boolean;
  isReady: boolean;
}

export type ConsentChoice = 'accepted' | 'declined' | null;

export interface ConsentState {
  decidedAt: number | null;
  choice: ConsentChoice;
  acceptedModels: string[];
}

export interface RegistryState {
  entries: Record<string, ModelEntry>;
  dialogVisible: boolean;
  consentState: ConsentState | null;
  activeBackend: AsrBackend | null;
}
