import type { Diarizer } from '@/lib/diarization/browser';
import { setState } from './store';
import type { DiarizationStatus, Source } from './types';
import type { DownloadWaitState } from './types/diarization-bridge';

export const activeDiarizers = new Map<Source, Diarizer>();
export const currentSpeaker = new Map<Source, string>();
export const latestTurnEnd = new Map<Source, number>();
export const heardUntil = new Map<Source, number>();
export const waitingSources = new Set<Source>();
export const downloadWait: DownloadWaitState = { stop: null, redownloadedThisSession: false };

export function labelFor(source: 'mic' | 'system'): string {
  return currentSpeaker.get(source) ?? `${source}:0`;
}

export function setDiarizationStatus(status: DiarizationStatus): void {
  setState({ diarization: status });
}
