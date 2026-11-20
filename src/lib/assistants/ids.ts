import type { AssistantId } from './types';

export const ASSISTANT_IDS: readonly AssistantId[] = [
  'claude-desktop',
  'claude-code',
  'codex-app',
  'codex',
  'gemini-app',
  'agy',
];

export function isAssistantId(value: unknown): value is AssistantId {
  return typeof value === 'string' && (ASSISTANT_IDS as readonly string[]).includes(value);
}
