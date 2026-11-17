import type { ModelEntry } from '@/lib/asr/browser';
import type { AssistantState } from '@/components/settings/Assistant.types';
import type { ComponentProps } from 'react';
import type { Modal } from '@jensbouma123/acciva-ui';
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
  nextDescribedBy?: string;
  onSkip?: () => void;
  onBack: () => void;
  onNext: () => void;
}

export interface AssistantStepProps {
  state: AssistantState;
  searchMissing: boolean;
  onSkip: () => void;
}

export interface OnboardingModalProps extends Omit<ComponentProps<typeof Modal>, 'open' | 'onClose'> {
  closable: boolean;
  onClose?: () => void;
}
