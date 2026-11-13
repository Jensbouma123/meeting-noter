import type { BrowserASRPhase, ModelProgressStage } from '@/lib/asr/browser';

export interface BrowserASRProgress {
  enabled: boolean;
  phase: BrowserASRPhase;
  stage: ModelProgressStage | null;
  percent: number | null;
  detail: string | null;
  label: string | null;
}
