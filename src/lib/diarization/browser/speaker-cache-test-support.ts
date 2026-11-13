import { SpeakerCache } from './speaker-cache';
import type { SpeakerCacheConfig } from './types';

export const HIDDEN = 2;
export const SPEAKERS = 2;
export const SILENCE_ID = -1;
export const QUIET = [0.05, 0.05];
export const SPEAKING_FIRST = [0.9, 0.05];

const SUBSAMPLING = 2;

export function makeCache(config: Partial<SpeakerCacheConfig> = {}): SpeakerCache {
  return new SpeakerCache({
    fifoLength: 6,
    cacheLength: 8,
    updatePeriod: 4,
    numSpeakers: SPEAKERS,
    hiddenSize: HIDDEN,
    subsamplingFactor: SUBSAMPLING,
    ...config,
  });
}

function embedsFromFrameIds(frameIds: number[]): Float32Array {
  const out = new Float32Array(frameIds.length * HIDDEN);
  frameIds.forEach((id, i) => out.fill(id, i * HIDDEN, (i + 1) * HIDDEN));
  return out;
}

const silence = embedsFromFrameIds([SILENCE_ID]);

function logit(p: number): number {
  return Math.log(p / (1 - p));
}

function logitsForPooledProbs(probs: number[][]): Float32Array {
  const out = new Float32Array(probs.length * SUBSAMPLING * SPEAKERS);
  probs.forEach((row, t) => {
    for (let j = 0; j < SUBSAMPLING; j += 1) {
      row.forEach((p, k) => {
        out[(t * SUBSAMPLING + j) * SPEAKERS + k] = logit(p);
      });
    }
  });
  return out;
}

export function cachedFrameIds(cache: SpeakerCache): number[] {
  const e = cache.getEmbeds();
  const out: number[] = [];
  for (let i = 0; i < e.length; i += HIDDEN) out.push(Math.round(e[i]));
  return out;
}

export function stepCache(
  cache: SpeakerCache,
  chunk: number[],
  rows: number[][] = [],
  lookahead: number[] = [],
): void {
  const inputFrames = cache.numCachedFrames + chunk.length + lookahead.length;
  const probs = Array.from({ length: inputFrames }, (_, i) => rows[i] ?? QUIET);
  cache.update(embedsFromFrameIds([...chunk, ...lookahead]), logitsForPooledProbs(probs), silence, chunk.length);
}
