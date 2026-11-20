export type AskAssistantId = 'claude' | 'chatgpt' | 'gemini' | 'copilot' | 'perplexity' | 'mistral';

export type AskPresetId = 'summary' | 'decisions' | 'actions' | 'all' | 'cleanup';

export type AskLanguage = 'en' | 'nl';

export interface AskAssistant {
  id: AskAssistantId;
  name: string;
  newChatUrl: string;
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
  url: string;
  prefilled: boolean;
}
