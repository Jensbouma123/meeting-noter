import type { AskAssistant, AskTarget } from './types';

export const MAX_PREFILL_ENCODED_CHARS = 6000;

export function resolveAskTarget(
  assistant: AskAssistant,
  prompt: string,
  maxEncodedChars = MAX_PREFILL_ENCODED_CHARS,
): AskTarget {
  const encoded = encodeURIComponent(prompt);
  if (assistant.prefillUrl && encoded.length <= maxEncodedChars) {
    return { url: assistant.prefillUrl(encoded), prefilled: true };
  }
  return { url: assistant.newChatUrl, prefilled: false };
}
