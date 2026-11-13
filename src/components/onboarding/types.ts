import type { ModelEntry } from '@/lib/asr/browser';
import type { AppSettings } from '@/components/meeting/types';
import type { STEPS } from './constants';

export type StepId = (typeof STEPS)[number];

export interface OnboardingModels {
  list: ModelEntry[];
  modelsReady: boolean;
  downloading: ModelEntry[];
  failed: boolean;
  percent: number;
  sizeText: string;
  startDownload: () => void;
}

export interface OnboardingDialogProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export interface OnboardingFooterProps {
  step: number;
  isLast: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
}
