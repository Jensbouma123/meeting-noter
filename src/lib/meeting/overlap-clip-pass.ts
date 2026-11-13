import { missedWords, wordMidpoint } from './overlap-missed-words';
import type {
  AttributedWord,
  AudioAt,
  OverlapSpan,
  OverlapTurn,
  TranscribeClip,
} from './types/overlap-retranscribe';

export const RETRANSCRIBE_PAD_SECONDS = 0.3;

export function quieterSpeaker(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
): string | null {
  if (span.speakers.length === 0) return null;
  const words = new Map<string, number>();
  for (const w of first) {
    const at = wordMidpoint(w);
    if (at >= span.start && at < span.end) words.set(w.speaker, (words.get(w.speaker) ?? 0) + 1);
  }
  const time = new Map<string, number>();
  for (const t of turns) {
    const o = Math.min(span.end, t.end) - Math.max(span.start, t.start);
    if (o > 0) time.set(t.speaker, (time.get(t.speaker) ?? 0) + o);
  }
  return [...span.speakers].sort(
    (a, b) => (words.get(a) ?? 0) - (words.get(b) ?? 0) || (time.get(b) ?? 0) - (time.get(a) ?? 0),
  )[0];
}

export async function retranscribeOverlap(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  audioAt: AudioAt,
  transcribe: TranscribeClip,
): Promise<AttributedWord[]> {
  const speaker = quieterSpeaker(span, first, turns);
  if (!speaker) return [];
  const clip = audioAt(span.start - RETRANSCRIBE_PAD_SECONDS, span.end + RETRANSCRIBE_PAD_SECONDS);
  if (!clip || clip.audio.length === 0) return [];
  const heard = (await transcribe(clip.audio)).map((w) => ({
    text: w.text,
    start: w.start + clip.start,
    end: w.end + clip.start,
  }));
  return missedWords(first, heard, span).map((w) => ({ ...w, speaker }));
}
