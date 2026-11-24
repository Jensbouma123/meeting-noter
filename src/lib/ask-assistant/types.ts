import type { AssistantId } from '@/lib/assistants/types';

export type AskAssistantId = AssistantId;

export type AskPresetId = 'summary' | 'decisions' | 'actions' | 'all' | 'cleanup';

export type AskLanguage = 'en' | 'nl';

export interface AskLink {
  newChat: string;
  prefill?: (encodedPrompt: string) => string;
}

export type AskServerLaunch = 'terminal' | 'app';

export interface AskAssistant {
  id: AskAssistantId;
  app?: AskLink;
  web?: AskLink;
  serverLaunch?: AskServerLaunch;
}

export type AskOutcome = 'opened' | 'accessibility' | 'copied' | 'copy-failed';

export type AskLaunchResponse = { ok: true; prefilled: boolean; reason?: 'accessibility' } | { ok: false };

export interface AskDeliveryIo {
  copy: (text: string) => Promise<boolean>;
  launchApp: (appUrl: string, webUrl: string | null) => void;
  openWeb: (url: string) => void;
  requestLaunch: (id: AskAssistantId, prompt: string) => Promise<AskLaunchResponse>;
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
  transcriptLanguage?: string | null;
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
