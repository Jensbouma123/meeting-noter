import { isAssistantId } from '@/lib/assistants/ids';
import type { AskAssistant, AskAssistantId } from './types';

const CLAUDE_APP_NEW_CHAT = 'claude://claude.ai/new';
const CLAUDE_WEB_NEW_CHAT = 'https://claude.ai/new';

export const ASK_ASSISTANTS: Readonly<Record<AskAssistantId, AskAssistant>> = {
  'claude-desktop': {
    id: 'claude-desktop',
    app: {
      newChat: CLAUDE_APP_NEW_CHAT,
      prefill: (q) => `${CLAUDE_APP_NEW_CHAT}?q=${q}`,
    },
    web: {
      newChat: CLAUDE_WEB_NEW_CHAT,
      prefill: (q) => `${CLAUDE_WEB_NEW_CHAT}?q=${q}`,
    },
  },
  'claude-code': { id: 'claude-code', serverLaunch: 'terminal' },
  'codex-app': {
    id: 'codex-app',
    serverLaunch: 'app',
    web: { newChat: 'https://chatgpt.com/codex' },
  },
  codex: { id: 'codex', serverLaunch: 'terminal' },
  'gemini-app': {
    id: 'gemini-app',
    app: { newChat: 'googlegemini://' },
    web: { newChat: 'https://gemini.google.com/app' },
  },
  agy: { id: 'agy', serverLaunch: 'terminal' },
};

export const isAskAssistantId = isAssistantId;

export function getAskAssistant(id: AskAssistantId): AskAssistant {
  return ASK_ASSISTANTS[id];
}

export function pickAskAssistant(
  stored: AskAssistantId | null,
  configured: readonly AskAssistantId[],
): AskAssistantId | null {
  if (stored && configured.includes(stored)) return stored;
  return configured[0] ?? null;
}
