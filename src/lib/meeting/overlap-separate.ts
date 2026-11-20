import { SEPARATION_PAD_SECONDS, SEPARATION_RATE_WINDOW_MS, separationGate } from './overlap-separate-gate';
import { acceptedMapping, scoreTracks } from './overlap-track-map';
import { stampTrackWords } from './overlap-track-words';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { Source } from './types';
import type { AttributedWord, AudioAt, OverlapSpan, OverlapTurn, TimedWord, TranscribeClip } from './types/overlap-retranscribe';
import type { OverlapSeparator, SeparatedWords, SeparationClipLog, SeparationOutcome, SeparationStats, TrackWords } from './types/overlap-separate';

const gate = { running: false, recent: [] as number[] };
let stats: SeparationStats = { outcomes: {}, clips: [], log: [] };

function finish(entry: SeparationClipLog, outcome: SeparationOutcome): null {
  entry.outcome = outcome;
  stats.outcomes[outcome] = (stats.outcomes[outcome] ?? 0) + 1;
  return null;
}

export function separationStats(): SeparationStats {
  return { outcomes: { ...stats.outcomes }, clips: [...stats.clips], log: stats.log.map((e) => ({ ...e })) };
}

export function resetSeparation(): void {
  gate.running = false;
  gate.recent = [];
  stats = { outcomes: {}, clips: [], log: [] };
}

// The live ASR answers [] while it is busy, so one empty answer earns a second try before the track counts as silent.
async function hear(track: Float32Array, transcribe: TranscribeClip): Promise<TimedWord[]> {
  const words = await transcribe(track);
  return words.length ? words : transcribe(track);
}

export async function separateOverlap(
  span: OverlapSpan,
  source: Source,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  audioAt: AudioAt,
  transcribe: TranscribeClip,
  sep: OverlapSeparator,
): Promise<SeparatedWords | null> {
  const now = performance.now();
  const entry: SeparationClipLog = { start: span.start, end: span.end, speakers: [...span.speakers], outcome: 'separated' };
  stats.log.push(entry);
  const skip = separationGate(span, source, sep.backend(), gate, now);
  if (skip) return finish(entry, skip);
  const clip = audioAt(span.start - SEPARATION_PAD_SECONDS, span.end + SEPARATION_PAD_SECONDS);
  if (!clip || clip.audio.length === 0) return finish(entry, 'audio');
  gate.running = true;
  gate.recent = [...gate.recent.filter((t) => now - t < SEPARATION_RATE_WINDOW_MS), now];
  try {
    const tracks = await sep.separate(clip.audio);
    const timing = { seconds: clip.audio.length / CAPTURE_SAMPLE_RATE, ms: Math.round(performance.now() - now), backend: sep.backend() };
    stats.clips.push(timing);
    console.info('[overlap-sep] clip', timing);
    const score = scoreTracks(tracks, [span.speakers[0], span.speakers[1]], turns, clip.start);
    entry.margin = score.margin;
    entry.solo = score.solo;
    const mapping = acceptedMapping(score);
    if (!mapping) return finish(entry, 'unmapped');
    const heard: TrackWords[] = [];
    for (const [i, track] of tracks.entries()) {
      const words = (await hear(track, transcribe)).map((w) => ({ text: w.text, start: w.start + clip.start, end: w.end + clip.start }));
      heard.push({ speaker: mapping.speakers[i], track, heard: words });
    }
    entry.tracks = heard.map((t) => ({ speaker: t.speaker, words: t.heard.map((w) => w.text).join(' ') }));
    if (heard.some((t) => t.heard.length === 0)) return finish(entry, 'empty');
    const result = stampTrackWords(heard, first, span, clip.audio, clip.start);
    entry.added = result.words.length - result.moved.length;
    entry.moved = result.moved.length;
    if (result.words.length === 0) return finish(entry, 'unchanged');
    finish(entry, 'separated');
    return result;
  } catch (err) {
    console.warn('[overlap-sep] Separation failed', err);
    return finish(entry, 'error');
  } finally {
    gate.running = false;
  }
}
