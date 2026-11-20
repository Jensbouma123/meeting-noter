import { missedWords, wordMidpoint } from './overlap-missed-words';
import type { AttributedWord, AudioAt, OverlapSpan, OverlapTurn, TranscribeClip } from './types/overlap-retranscribe';

export const RETRANSCRIBE_PAD_SECONDS = 0.3;

export function quieterSpeaker(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  wordCount?: (speaker: string) => number,
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
    (a, b) => (wordCount?.(a) ?? words.get(a) ?? 0) - (wordCount?.(b) ?? words.get(b) ?? 0) || (time.get(b) ?? 0) - (time.get(a) ?? 0),
  )[0];
}

const LOCAL_WORD_SECONDS = 1;

export function activeSpeakerAt(
  at: number,
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
): string | null {
  const active = span.speakers.filter((s) => turns.some((t) => t.speaker === s && t.start <= at && at < t.end));
  if (active.length <= 1) return active[0] ?? null;
  const near = (s: string) =>
    first.filter((w) => w.speaker === s && Math.abs(wordMidpoint(w) - at) <= LOCAL_WORD_SECONDS).length;
  return quieterSpeaker({ ...span, speakers: active }, first, turns, near);
}

export async function retranscribeOverlap(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  audioAt: AudioAt,
  transcribe: TranscribeClip,
): Promise<AttributedWord[]> {
  const fallback = quieterSpeaker(span, first, turns);
  if (!fallback) return [];
  const clip = audioAt(span.start - RETRANSCRIBE_PAD_SECONDS, span.end + RETRANSCRIBE_PAD_SECONDS);
  if (!clip || clip.audio.length === 0) return [];
  const heard = (await transcribe(clip.audio)).map((w) => ({
    text: w.text,
    start: w.start + clip.start,
    end: w.end + clip.start,
  }));
  return missedWords(first, heard, span).map((w) => ({ ...w, speaker: activeSpeakerAt(wordMidpoint(w), span, first, turns) ?? fallback }));
}
