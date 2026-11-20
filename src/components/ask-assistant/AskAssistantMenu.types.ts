import type { AskAssistantId, AskPresetId } from '@/lib/ask-assistant';

export interface AskAssistantMenuProps {
  assistantId: AskAssistantId | null;
  configuredIds: readonly AskAssistantId[];
  loaded: boolean;
  hasTranscript: boolean;
  onPreset: (preset: AskPresetId) => void;
  onCustom: () => void;
  onOpenSettings: () => void;
}
