import { missedWords } from './overlap-missed-words';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { AttributedWord, OverlapSpan, TimedWord } from './types/overlap-retranscribe';
import type { TrackWords } from './types/overlap-separate';

export const MAX_TRACK_DROP_DB = 20;

function energy(pcm: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = Math.max(0, from); i < Math.min(pcm.length, to); i += 1) sum += pcm[i] * pcm[i];
  return sum;
}

export function audibleOnTrack(word: TimedWord, track: Float32Array, mix: Float32Array, clipStart: number): boolean {
  const from = Math.round((word.start - clipStart) * CAPTURE_SAMPLE_RATE);
  const to = Math.round((word.end - clipStart) * CAPTURE_SAMPLE_RATE);
  const own = energy(track, from, to);
  const all = energy(mix, from, to);
  if (all <= 0) return own > 0;
  return 10 * Math.log10(Math.max(own, 1e-12) / all) >= -MAX_TRACK_DROP_DB;
}

export function stampTrackWords(
  tracks: readonly TrackWords[],
  first: readonly AttributedWord[],
  span: OverlapSpan,
  mix: Float32Array,
  clipStart: number,
): AttributedWord[] {
  const out: AttributedWord[] = [];
  for (const { speaker, track, heard } of tracks) {
    for (const w of missedWords(first, heard, span)) {
      if (audibleOnTrack(w, track, mix, clipStart)) out.push({ text: w.text, start: w.start, end: w.end, speaker });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
