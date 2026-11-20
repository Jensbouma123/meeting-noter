import type { AskAssistant, AskLink, AskTarget } from "./types";

export const MAX_PREFILL_ENCODED_CHARS = 6000;

function linkUrl(
  link: AskLink | undefined,
  encoded: string | null,
): string | null {
  if (!link) return null;
  return encoded !== null && link.prefill
    ? link.prefill(encoded)
    : link.newChat;
}

export function resolveAskTarget(
  assistant: AskAssistant,
  prompt: string,
  maxEncodedChars = MAX_PREFILL_ENCODED_CHARS,
): AskTarget {
  const encoded = encodeURIComponent(prompt);
  const fits =
    encoded.length <= maxEncodedChars && Boolean(assistant.app?.prefill);
  const carried = fits ? encoded : null;
  return {
    appUrl: linkUrl(assistant.app, carried),
    webUrl: linkUrl(assistant.web, carried),
    prefilled: fits,
  };
}
