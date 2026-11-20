import { missedWords, wordMidpoint } from './overlap-missed-words';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { AttributedWord, OverlapSpan, TimedWord } from './types/overlap-retranscribe';
import type { SeparatedWords, TrackWords } from './types/overlap-separate';

export const MAX_TRACK_DROP_DB = 20;
// A first-pass word moves to another speaker only when that speaker's track carries it this much louder than the other track.
export const RELABEL_MIN_DB = 6;

function energy(pcm: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = Math.max(0, from); i < Math.min(pcm.length, to); i += 1) sum += pcm[i] * pcm[i];
  return sum;
}

function wordEnergy(word: TimedWord, pcm: Float32Array, clipStart: number): number {
  return energy(pcm, Math.round((word.start - clipStart) * CAPTURE_SAMPLE_RATE), Math.round((word.end - clipStart) * CAPTURE_SAMPLE_RATE));
}

const ratioDb = (own: number, other: number) => 10 * Math.log10(Math.max(own, 1e-12) / Math.max(other, 1e-12));

export function audibleOnTrack(word: TimedWord, track: Float32Array, mix: Float32Array, clipStart: number): boolean {
  const own = wordEnergy(word, track, clipStart);
  const all = wordEnergy(word, mix, clipStart);
  if (all <= 0) return own > 0;
  return ratioDb(own, all) >= -MAX_TRACK_DROP_DB;
}

function dominanceDb(word: TimedWord, own: TrackWords, tracks: readonly TrackWords[], clipStart: number): number {
  const mine = wordEnergy(word, own.track, clipStart);
  const others = tracks.filter((t) => t !== own).map((t) => wordEnergy(word, t.track, clipStart));
  return others.length ? ratioDb(mine, Math.max(...others)) : Infinity;
}

const inSpan = (w: TimedWord, span: OverlapSpan) => wordMidpoint(w) >= span.start && wordMidpoint(w) < span.end;

const heardOn = (t: TrackWords, w: AttributedWord, span: OverlapSpan) => missedWords(t.heard, [w], span).length === 0;

function relabels(tracks: readonly TrackWords[], first: readonly AttributedWord[], span: OverlapSpan, clipStart: number): [AttributedWord, string][] {
  const moved: [AttributedWord, string][] = [];
  for (const w of first) {
    if (!inSpan(w, span)) continue;
    const owner = tracks
      .filter((t) => heardOn(t, w, span))
      .sort((a, b) => wordEnergy(w, b.track, clipStart) - wordEnergy(w, a.track, clipStart))[0];
    if (owner && owner.speaker !== w.speaker && dominanceDb(w, owner, tracks, clipStart) >= RELABEL_MIN_DB) moved.push([w, owner.speaker]);
  }
  return moved;
}

export function stampTrackWords(
  tracks: readonly TrackWords[],
  first: readonly AttributedWord[],
  span: OverlapSpan,
  mix: Float32Array,
  clipStart: number,
): SeparatedWords {
  const moves = relabels(tracks, first, span, clipStart);
  const words: AttributedWord[] = moves.map(([w, speaker]) => ({ text: w.text, start: w.start, end: w.end, speaker }));
  for (const t of tracks) {
    for (const w of missedWords(first, t.heard, span)) {
      // A word louder on another track is that speaker's leak, not this speaker's line.
      if (audibleOnTrack(w, t.track, mix, clipStart) && dominanceDb(w, t, tracks, clipStart) >= 0) words.push({ text: w.text, start: w.start, end: w.end, speaker: t.speaker });
    }
  }
  return { words: words.sort((a, b) => a.start - b.start), moved: moves.map(([w]) => w) };
}
