export function hasSpeech(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

export function normalizeWord(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

export function cleanWords<T extends { text: string }>(words: readonly T[]): T[] {
  const out: T[] = [];
  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;
    if (hasSpeech(text)) {
      out.push({ ...word, text });
    } else if (out.length > 0) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { ...prev, text: prev.text + text };
    }
  }
  return out;
}

export function agreedPrefix(a: readonly { text: string }[], b: readonly { text: string }[]): number {
  let n = 0;
  while (n < a.length && n < b.length && normalizeWord(a[n].text) === normalizeWord(b[n].text)) n += 1;
  return n;
}
