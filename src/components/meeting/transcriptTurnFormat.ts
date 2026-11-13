import type { TextToken } from './TranscriptTurn.types';

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function splitIntoWordAndSpaceTokens(text: string): TextToken[] {
  const parts = text.split(/(\s+)/);
  return parts.filter((p) => p.length > 0).map((p) => ({ word: /\S/.test(p), value: p }));
}
