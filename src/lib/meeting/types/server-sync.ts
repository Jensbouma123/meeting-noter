export interface MigrationResult {
  imported: number;
  skipped: number;
  invalid: number;
  dataDir: string;
}

export interface PendingSync {
  save: string[];
  remove: string[];
}

export interface SyncState {
  enabled: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setInterval> | null;
  onOnline: (() => void) | null;
  flushing: Promise<void> | null;
  generation: Map<string, number>;
  clearGeneration: Map<string, number>;
}
