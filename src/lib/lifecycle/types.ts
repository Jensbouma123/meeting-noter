import type { InstallInfo } from '../update/types';
import type { IdleTracker } from './idle-shutdown';

export type IdleOptions = {
  now?: () => number;
  staleMs?: number;
  recordingStaleMs?: number;
  closeGraceMs?: number;
};

export type Beat = { recording?: boolean; closing?: boolean };

export type Client = { deadline: number; recording: boolean };

export type Lifecycle = { tracker: IdleTracker; idleShutdown: boolean; install: InstallInfo; timer: NodeJS.Timeout | null };

export type SentHeartbeat = { clientId: string; recording: boolean; closing?: boolean };
