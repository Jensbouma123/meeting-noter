import type { ModelEntry } from '@/lib/asr/browser';
import type { AssistantState } from '@/components/settings/Assistant.types';
import type { STEPS } from './constants';

export type StepId = (typeof STEPS)[number];

export interface OnboardingModels {
  list: ModelEntry[];
  modelsReady: boolean;
  downloading: ModelEntry[];
  failed: boolean;
  percent: number;
  sizeText: string;
  searchMissing: boolean;
  startDownload: () => void;
}

export interface OnboardingFooterProps {
  step: number;
  isLast: boolean;
  nextDisabled?: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
}

export interface AssistantStepProps {
  state: AssistantState;
  searchMissing: boolean;
  onSkip: () => void;
}
