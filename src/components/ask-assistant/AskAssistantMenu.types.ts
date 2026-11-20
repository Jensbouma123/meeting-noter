import type { AskAssistantId, AskPresetId } from '@/lib/ask-assistant';

export interface AskAssistantMenuProps {
  assistantId: AskAssistantId;
  hasTranscript: boolean;
  onPreset: (preset: AskPresetId) => void;
  onCustom: () => void;
}
