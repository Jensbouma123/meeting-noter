import type { AskAssistantId } from '@/lib/ask-assistant';

export interface AskAssistantPickerProps {
  assistantId: AskAssistantId | null;
  configuredIds: readonly AskAssistantId[];
  onOpenSettings: () => void;
}
