import type { AskAssistantId, AskPresetId } from '@/lib/ask-assistant';

export interface AskAssistantMenuProps {
  assistant: { id: AskAssistantId; name: string } | null;
  configuredIds: readonly AskAssistantId[];
  loaded: boolean;
  hasTranscript: boolean;
  onPreset: (preset: AskPresetId) => void;
  onCustom: () => void;
  onOpenSettings: () => void;
}
