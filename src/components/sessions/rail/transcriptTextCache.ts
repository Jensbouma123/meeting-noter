import { readTranscriptText } from './readTranscriptText';

const cache = new Map<string, string>();

export function lowerTranscriptText(sessionId: string, updatedAt: number): string {
  const key = `${sessionId}:${updatedAt}`;
  let text = cache.get(key);
  if (text === undefined) {
    text = readTranscriptText(sessionId).toLowerCase();
    cache.set(key, text);
  }
  return text;
}
