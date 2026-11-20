import { SEPARATION_PAD_SECONDS, SEPARATION_RATE_WINDOW_MS, separationGate } from './overlap-separate-gate';
import { mapTracks } from './overlap-track-map';
import { stampTrackWords } from './overlap-track-words';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { Source } from './types';
import type { AttributedWord, AudioAt, OverlapSpan, OverlapTurn, TranscribeClip } from './types/overlap-retranscribe';
import type { OverlapSeparator, SeparationOutcome, SeparationStats, TrackWords } from './types/overlap-separate';

const gate = { running: false, recent: [] as number[] };
let stats: SeparationStats = { outcomes: {}, clips: [] };

function count(outcome: SeparationOutcome): void {
  stats.outcomes[outcome] = (stats.outcomes[outcome] ?? 0) + 1;
}

export function separationStats(): SeparationStats {
  return { outcomes: { ...stats.outcomes }, clips: [...stats.clips] };
}

export function resetSeparation(): void {
  gate.running = false;
  gate.recent = [];
  stats = { outcomes: {}, clips: [] };
}

export async function separateOverlap(
  span: OverlapSpan,
  source: Source,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  audioAt: AudioAt,
  transcribe: TranscribeClip,
  sep: OverlapSeparator,
): Promise<AttributedWord[] | null> {
  const now = performance.now();
  const skip = separationGate(span, source, sep.backend(), gate, now);
  if (skip) {
    count(skip);
    return null;
  }
  const clip = audioAt(span.start - SEPARATION_PAD_SECONDS, span.end + SEPARATION_PAD_SECONDS);
  if (!clip || clip.audio.length === 0) {
    count('audio');
    return null;
  }
  gate.running = true;
  gate.recent = [...gate.recent.filter((t) => now - t < SEPARATION_RATE_WINDOW_MS), now];
  try {
    const tracks = await sep.separate(clip.audio);
    const timing = { seconds: clip.audio.length / CAPTURE_SAMPLE_RATE, ms: Math.round(performance.now() - now), backend: sep.backend() };
    stats.clips.push(timing);
    console.info('[overlap-sep] clip', timing);
    const mapping = mapTracks(tracks, [span.speakers[0], span.speakers[1]], turns, clip.start);
    if (!mapping) {
      count('unmapped');
      return null;
    }
    const heard: TrackWords[] = [];
    for (const [i, track] of tracks.entries()) {
      const words = (await transcribe(track)).map((w) => ({ text: w.text, start: w.start + clip.start, end: w.end + clip.start }));
      heard.push({ speaker: mapping.speakers[i], track, heard: words });
    }
    count('separated');
    return stampTrackWords(heard, first, span, clip.audio, clip.start);
  } catch (err) {
    count('error');
    console.warn('[overlap-sep] Separation failed', err);
    return null;
  } finally {
    gate.running = false;
  }
}
