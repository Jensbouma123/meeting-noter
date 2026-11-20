import type { AssistantId } from '@/lib/assistants/types';

export type AskAssistantId = AssistantId;

export type AskPresetId = 'summary' | 'decisions' | 'actions' | 'all' | 'cleanup';

export type AskLanguage = 'en' | 'nl';

export interface AskAssistant {
  id: AskAssistantId;
  newChatUrl?: string;
  prefillUrl?: (encodedPrompt: string) => string;
}

export interface AskTurn {
  speaker: string;
  text: string;
}

export interface AskPromptInput {
  instruction: string;
  title: string;
  dateLabel: string;
  turns: AskTurn[];
  language: AskLanguage;
}

export interface AskTarget {
  url: string | null;
  prefilled: boolean;
}

export interface ConfiguredAssistants {
  loaded: boolean;
  ids: readonly AskAssistantId[];
}
