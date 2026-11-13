export interface UpdateInfo {
  current: string;
  latest: string | null;
  available: boolean;
  name: string | null;
  notes: string | null;
  publishedAt: string | null;
  pageUrl: string;
  installKind: 'installer' | 'git' | 'source' | 'dev' | 'unknown';
  canApply: boolean;
  applyBlockedReason: string | null;
  restartAutomatic: boolean;
}

export interface UpdateStatus {
  state: 'idle' | 'running' | 'done' | 'failed';
  phase: 'starting' | 'downloading' | 'installing' | 'restarting' | 'model' | null;
  percent: number | null;
  code: string;
  detail: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  restartRequired: boolean;
  logTail: string;
}

export interface UpdateSnapshot {
  status: 'idle' | 'checking' | 'available' | 'error';
  info: UpdateInfo | null;
  dismissedVersion: string | null;
  applyStatus: UpdateStatus | null;
}

export type UpdateResponse = Partial<UpdateInfo>;
