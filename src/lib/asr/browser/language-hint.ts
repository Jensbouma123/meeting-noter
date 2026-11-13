let hint: string | null = null;
const listeners = new Set<() => void>();

export function getAsrLanguageHint(): string | null {
  return hint;
}

export function setAsrLanguageHint(code: string | null): void {
  if (code === hint) return;
  hint = code;
  for (const fn of listeners) fn();
}

export function subscribeAsrLanguageHint(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
