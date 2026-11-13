import { loadSessionTranscript } from '@/lib/meeting/session-transcript-storage';

export function readTranscriptText(sessionId: string): string {
  const t = loadSessionTranscript(sessionId);
  return t ? t.segments.map((seg) => seg.text).join(' ') : '';
}
