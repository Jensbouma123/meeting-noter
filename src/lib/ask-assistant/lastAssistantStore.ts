import { DEFAULT_ASK_ASSISTANT, isAskAssistantId } from './assistants';
import type { AskAssistantId } from './types';

export const LAST_ASSISTANT_KEY = 'meeting-noter.ask-assistant';

const listeners = new Set<() => void>();
let memoryChoice: AskAssistantId | null = null;

function readStored(): AskAssistantId {
  try {
    const raw = localStorage.getItem(LAST_ASSISTANT_KEY);
    return isAskAssistantId(raw) ? raw : DEFAULT_ASK_ASSISTANT;
  } catch {
    return DEFAULT_ASK_ASSISTANT;
  }
}

export function subscribeLastAssistant(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getLastAssistant(): AskAssistantId {
  return memoryChoice ?? readStored();
}

export function getServerLastAssistant(): AskAssistantId {
  return DEFAULT_ASK_ASSISTANT;
}

export function storeLastAssistant(next: AskAssistantId) {
  try {
    localStorage.setItem(LAST_ASSISTANT_KEY, next);
    memoryChoice = null;
  } catch {
    memoryChoice = next;
  }
  listeners.forEach((notify) => notify());
}
