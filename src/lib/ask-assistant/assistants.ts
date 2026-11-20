import type { AskAssistant, AskAssistantId } from './types';

export const DEFAULT_ASK_ASSISTANT: AskAssistantId = 'claude';

export const ASK_ASSISTANTS: readonly AskAssistant[] = [
  {
    id: 'claude',
    name: 'Claude',
    newChatUrl: 'https://claude.ai/new',
    prefillUrl: (q) => `https://claude.ai/new?q=${q}`,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    newChatUrl: 'https://chatgpt.com/',
    prefillUrl: (q) => `https://chatgpt.com/?q=${q}`,
  },
  { id: 'gemini', name: 'Gemini', newChatUrl: 'https://gemini.google.com/app' },
  {
    id: 'copilot',
    name: 'Copilot',
    newChatUrl: 'https://copilot.microsoft.com/',
    prefillUrl: (q) => `https://copilot.microsoft.com/?q=${q}`,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    newChatUrl: 'https://www.perplexity.ai/',
    prefillUrl: (q) => `https://www.perplexity.ai/search?q=${q}`,
  },
  { id: 'mistral', name: 'Le Chat', newChatUrl: 'https://chat.mistral.ai/chat' },
];

export function isAskAssistantId(value: unknown): value is AskAssistantId {
  return typeof value === 'string' && ASK_ASSISTANTS.some((a) => a.id === value);
}

export function getAskAssistant(id: AskAssistantId): AskAssistant {
  return ASK_ASSISTANTS.find((a) => a.id === id) ?? ASK_ASSISTANTS[0];
}
