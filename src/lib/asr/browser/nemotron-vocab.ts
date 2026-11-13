import { NEMOTRON } from './nemotron-constants';
import type { BrowserWord, NemotronToken } from './types';

export function parseNemotronVocab(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((l) => l.replace(/\r$/, ''));
}

export function isSpecialPiece(piece: string): boolean {
  return piece.length > 2 && piece.startsWith('<') && piece.endsWith('>');
}

export function tokensToWords(
  tokens: readonly NemotronToken[],
  vocab: readonly string[],
  offsetSeconds = 0,
): BrowserWord[] {
  const words: BrowserWord[] = [];
  let text = '';
  let first = 0;
  let last = 0;
  let probSum = 0;
  let count = 0;
  const flush = () => {
    const trimmed = text.trim();
    if (trimmed) {
      const start = Math.max(0, first * NEMOTRON.frameSeconds - offsetSeconds);
      words.push({
        text: trimmed,
        start,
        end: Math.max(start, (last + 1) * NEMOTRON.frameSeconds - offsetSeconds),
        confidence: probSum / count,
      });
    }
    text = '';
    probSum = 0;
    count = 0;
  };
  for (const tok of tokens) {
    const piece = vocab[tok.id] ?? '';
    if (!piece || isSpecialPiece(piece)) continue;
    const boundary = piece.startsWith('▁');
    if (boundary && count > 0) flush();
    if (count === 0) first = tok.frame;
    text += boundary ? piece.slice(1) : piece;
    last = tok.frame;
    probSum += Math.exp(tok.logProb);
    count += 1;
  }
  if (count > 0) flush();
  return words;
}
