import { NUM_SPEAKERS, SAMPLE_RATE } from './manifest';
import type { Source, SpeakerTurn, TurnSpan } from './types';

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function chunkProbabilities(logits: Float32Array, firstLogitFrame: number, frameCount: number): Float32Array {
  const probs = new Float32Array(frameCount * NUM_SPEAKERS);
  for (let i = 0; i < probs.length; i += 1) probs[i] = sigmoid(logits[firstLogitFrame * NUM_SPEAKERS + i]);
  return probs;
}

export function spanToSpeakerTurn(span: TurnSpan, source: Source, originSample: number | null): SpeakerTurn {
  const originSec = (originSample ?? 0) / SAMPLE_RATE;
  return {
    speaker: `${source}:${span.speaker}`,
    source,
    start: originSec + span.start,
    end: originSec + span.end,
    id: `${source}#${span.run}`,
    final: span.final,
    ...(span.continues ? { continues: true } : {}),
  };
}
