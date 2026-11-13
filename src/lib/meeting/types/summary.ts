import type { useT } from '@/lib/i18n/useT';
import type { ActionItem, Decision } from './notes';

export type SummaryTranslator = ReturnType<typeof useT<'summary'>>;

export interface BuildSummaryOptions {
  title: string;
  date: string;
  durationS: number;
  participants: readonly string[];
  decisions: readonly Decision[];
  actions: readonly ActionItem[];
  transcript?: string;
  format: 'md' | 'txt';
  t: SummaryTranslator;
}
