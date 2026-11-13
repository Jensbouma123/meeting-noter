import type { ModelEntry, ModelStatus } from '@/lib/asr/browser';
import type { BadgeTone } from '../speech/types';

export interface ConsentDialogProps {
  onDismiss?: () => void;
}

export interface ConsentBadgeSpec {
  label: string;
  variant: BadgeTone;
}

export type ConsentBadgeTable = Record<ModelStatus, ConsentBadgeSpec | null>;

export interface ConsentFooterProps {
  preparing: boolean;
  userDeclined: boolean;
  primaryLabel: string;
  onStartDownloads: () => void;
  onDismiss?: () => void;
}

export interface ModelCardProps {
  entry: ModelEntry;
}
