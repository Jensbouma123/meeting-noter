import type { findNewerRelease } from './version.mjs';

export type InstallKind = 'installer' | 'git' | 'source' | 'dev' | 'unknown';

export type InstallInfo = {
  kind: InstallKind;
  current: string;
  root: string | null;
  arch: string | null;
  appDir: string;
  stateDir: string | null;
};

export type ApplyBlockedReason = 'already-running' | 'dev-mode' | 'unsupported-install';

export type UpdateCheck = {
  current: string;
  latest: string | null;
  available: boolean;
  name: string | null;
  notes: string | null;
  publishedAt: string | null;
  pageUrl: string | null;
  installKind: InstallKind;
  canApply: boolean;
  applyBlockedReason: ApplyBlockedReason | null;
  restartAutomatic: boolean;
};

export type Release = NonNullable<Awaited<ReturnType<typeof findNewerRelease>>>;

export type UpdateMeta = {
  kind: InstallKind;
  pid: number;
  fromVersion: string;
  toVersion: string;
  startedAt: string;
};

export type UpdatePhase = 'starting' | 'downloading' | 'installing' | 'restarting' | 'model';

export type UpdateCode =
  | 'preparing'
  | 'downloading'
  | 'installing'
  | 'restarting'
  | 'building-model'
  | 'updated'
  | 'updated-restart-required'
  | 'already-latest'
  | 'failed'
  | 'rolled-back'
  | 'interrupted';

export type UpdateStatus = {
  state: 'idle' | 'running' | 'done' | 'failed';
  phase: UpdatePhase | null;
  percent: number | null;
  code: UpdateCode | '';
  detail: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  restartRequired: boolean;
  logTail: string;
};

export type UpdateExit = { code: number; at: string };

export type DetectInstallOptions = { cwd?: string; env?: NodeJS.ProcessEnv; version?: string };
