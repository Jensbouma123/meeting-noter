import type { UseAskAssistantInput } from './useAskAssistant.types';

export interface AskAssistantButtonProps extends UseAskAssistantInput {
  onOpenSettings: () => void;
}
