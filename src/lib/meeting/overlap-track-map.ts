import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { OverlapTurn } from './types/overlap-retranscribe';
import type { TrackMapping, TrackScore } from './types/overlap-separate';

export const MAP_FRAME_SECONDS = 0.08;
export const MIN_MAP_MARGIN = 0.2;
export const MIN_SOLO_SECONDS = 0.3;

export function frameEnvelope(track: Float32Array, frame = Math.round(MAP_FRAME_SECONDS * CAPTURE_SAMPLE_RATE)): number[] {
  const env: number[] = [];
  for (let i = 0; i + frame <= track.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j += 1) sum += track[j] * track[j];
    env.push(Math.sqrt(sum / frame));
  }
  return env;
}

function activity(speaker: string, turns: readonly OverlapTurn[], clipStart: number, frames: number): number[] {
  return Array.from({ length: frames }, (_, i) => {
    const at = clipStart + (i + 0.5) * MAP_FRAME_SECONDS;
    return turns.some((t) => t.speaker === speaker && t.start <= at && at < t.end) ? 1 : 0;
  });
}

function correlation(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

function soloShare(env: readonly number[], own: readonly number[], other: readonly number[]): number {
  let mine = 0;
  let theirs = 0;
  env.forEach((e, i) => {
    if (own[i] && !other[i]) mine += e * e;
    if (other[i] && !own[i]) theirs += e * e;
  });
  return mine + theirs > 0 ? mine / (mine + theirs) : 0.5;
}

const soloSeconds = (own: readonly number[], other: readonly number[]) =>
  own.filter((v, i) => v && !other[i]).length * MAP_FRAME_SECONDS;

export function scoreTracks(
  tracks: readonly [Float32Array, Float32Array],
  speakers: readonly [string, string],
  turns: readonly OverlapTurn[],
  clipStart: number,
): TrackScore {
  const env = tracks.map((t) => frameEnvelope(t));
  const frames = Math.min(env[0].length, env[1].length);
  const [a, b] = speakers.map((s) => activity(s, turns, clipStart, frames));
  const score = (e: readonly number[], own: number[], other: number[]) => correlation(e, own) + soloShare(e, own, other);
  const straight = score(env[0], a, b) + score(env[1], b, a);
  const swapped = score(env[0], b, a) + score(env[1], a, b);
  return {
    speakers: straight >= swapped ? [speakers[0], speakers[1]] : [speakers[1], speakers[0]],
    margin: Math.abs(straight - swapped),
    solo: [soloSeconds(a, b), soloSeconds(b, a)],
  };
}

export function mapTracks(
  tracks: readonly [Float32Array, Float32Array],
  speakers: readonly [string, string],
  turns: readonly OverlapTurn[],
  clipStart: number,
): TrackMapping | null {
  return acceptedMapping(scoreTracks(tracks, speakers, turns, clipStart));
}

export function acceptedMapping({ speakers, margin, solo }: TrackScore): TrackMapping | null {
  if (solo[0] < MIN_SOLO_SECONDS || solo[1] < MIN_SOLO_SECONDS || margin < MIN_MAP_MARGIN) return null;
  return { speakers, margin };
}
