import type { ModelEntry } from '@/lib/asr/browser';
import type { ModelPreparationState } from '../preparation/types';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export interface StatusBadgeSpec {
  label: string;
  variant: BadgeTone;
}

export type StatusBadgeTable = Record<ModelEntry['status'], StatusBadgeSpec | null>;

export interface DeleteDownloadedModelsProps {
  models: ModelEntry[];
  preparation: ModelPreparationState;
}

export interface ModelStatusRowProps {
  entry: ModelEntry;
  preparation: ModelPreparationState;
}

export interface StatusIconProps {
  status: ModelEntry['status'];
  preparing: boolean;
}
