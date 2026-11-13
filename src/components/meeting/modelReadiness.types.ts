import type { ModelProgressStage } from '@/lib/asr/browser';
import type { BrowserASRPhase } from '@/lib/asr/browser/types';

export type ModelReadiness = 'not-downloaded' | 'downloading' | 'loading' | 'ready' | 'failed';

export interface AsrRuntimeState {
  enabled: boolean;
  phase: BrowserASRPhase;
}

export interface AsrRuntimeProgress extends AsrRuntimeState {
  percent: number | null;
  stage: ModelProgressStage | null;
  detail: string | null;
}

export interface ModelProgressView {
  stage: ModelProgressStage | null;
  percent: number | null;
  label: string;
  detail: string | null;
}
