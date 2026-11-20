import type { AskPresetId } from '@/lib/ask-assistant';

export interface AskPresetRowsProps {
  hasTranscript: boolean;
  onPreset: (preset: AskPresetId) => void;
  onCustom: () => void;
}
