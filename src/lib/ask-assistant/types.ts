import type { AssistantId } from '@/lib/assistants/types';

export type AskAssistantId = AssistantId;

export type AskPresetId = 'summary' | 'decisions' | 'actions' | 'all' | 'cleanup';

export type AskLanguage = 'en' | 'nl';

export interface AskLink {
  newChat: string;
  prefill?: (encodedPrompt: string) => string;
}

export interface AskAssistant {
  id: AskAssistantId;
  app?: AskLink;
  web?: AskLink;
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
  appUrl: string | null;
  webUrl: string | null;
  prefilled: boolean;
}

export interface ConfiguredAssistants {
  loaded: boolean;
  ids: readonly AskAssistantId[];
}
