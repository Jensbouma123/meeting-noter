import type {
  CompressedFrames,
  CompressionBudget,
  SpeakerCacheConfig,
} from './types';

const LOG_HALF = Math.log(0.5);

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function topKIndices(values: Float64Array, k: number): number[] {
  const order = Array.from(values.keys());
  order.sort((a, b) => {
    const va = values[a];
    const vb = values[b];
    if (va === vb) return a - b;
    return vb > va ? 1 : -1;
  });
  return order.slice(0, Math.min(k, order.length));
}

export function compressionBudget(config: SpeakerCacheConfig): CompressionBudget {
  const budget = Math.floor(config.cacheLength / config.numSpeakers) - config.silenceFramesPerSpeaker;
  return {
    minPositiveScores: Math.floor(budget * config.minPositiveScoresRate),
    numStrongBoosted: Math.floor(budget * config.strongBoostRate),
    numWeakBoosted: Math.floor(budget * config.weakBoostRate),
  };
}

export function poolProbsToEncoderRate(logits: Float32Array, config: SpeakerCacheConfig): Float32Array {
  const { numSpeakers: s, subsamplingFactor: f } = config;
  const numFrames = Math.floor(logits.length / s / f);
  const out = new Float32Array(numFrames * s);
  for (let t = 0; t < numFrames; t += 1) {
    for (let k = 0; k < s; k += 1) {
      let sum = 0;
      for (let j = 0; j < f; j += 1) sum += sigmoid(logits[(t * f + j) * s + k]);
      out[t * s + k] = sum / f;
    }
  }
  return out;
}

export function scoreFrames(
  probs: Float32Array,
  numFrames: number,
  config: SpeakerCacheConfig,
  minPositiveScores: number,
): Float64Array {
  const s = config.numSpeakers;
  const threshold = config.predictionScoreThreshold;
  const scores = new Float64Array(numFrames * s);
  for (let t = 0; t < numFrames; t += 1) {
    let logComplementSum = 0;
    for (let k = 0; k < s; k += 1) logComplementSum += Math.log(Math.max(1 - probs[t * s + k], threshold));
    for (let k = 0; k < s; k += 1) {
      const p = probs[t * s + k];
      const score =
        Math.log(Math.max(p, threshold)) - Math.log(Math.max(1 - p, threshold)) + logComplementSum - LOG_HALF;
      scores[t * s + k] = p > 0.5 ? score : -Infinity;
    }
  }
  for (let k = 0; k < s; k += 1) {
    let positives = 0;
    for (let t = 0; t < numFrames; t += 1) if (scores[t * s + k] > 0) positives += 1;
    if (positives < minPositiveScores) continue;
    for (let t = 0; t < numFrames; t += 1) {
      const i = t * s + k;
      if (probs[i] > 0.5 && !(scores[i] > 0)) scores[i] = -Infinity;
    }
  }
  return scores;
}

function boostTopFrames(
  scores: Float64Array,
  numFrames: number,
  numSpeakers: number,
  count: number,
  amount: number,
): void {
  const column = new Float64Array(numFrames);
  for (let k = 0; k < numSpeakers; k += 1) {
    for (let t = 0; t < numFrames; t += 1) column[t] = scores[t * numSpeakers + k];
    for (const t of topKIndices(column, count)) scores[t * numSpeakers + k] += amount;
  }
}

export function compressFrames(
  embeds: Float32Array,
  probs: Float32Array,
  numFrames: number,
  silenceEmbeds: Float32Array,
  config: SpeakerCacheConfig,
  budget: CompressionBudget,
): CompressedFrames {
  const { numSpeakers: s, hiddenSize: h, cacheLength, silenceFramesPerSpeaker } = config;
  const scores = scoreFrames(probs, numFrames, config, budget.minPositiveScores);
  for (let i = cacheLength * s; i < numFrames * s; i += 1) scores[i] += config.latestFramesScoreBoost;
  boostTopFrames(scores, numFrames, s, budget.numStrongBoosted, -2 * LOG_HALF);
  boostTopFrames(scores, numFrames, s, budget.numWeakBoosted, -LOG_HALF);

  const scored = numFrames + silenceFramesPerSpeaker;
  const flat = new Float64Array(s * scored);
  for (let k = 0; k < s; k += 1) {
    for (let t = 0; t < numFrames; t += 1) flat[k * scored + t] = scores[t * s + k];
    for (let t = numFrames; t < scored; t += 1) flat[k * scored + t] = Infinity;
  }
  const sentinel = s * scored;
  const picked = topKIndices(flat, cacheLength).map((i) => (flat[i] === -Infinity ? sentinel : i));
  picked.sort((a, b) => a - b);

  const outEmbeds = new Float32Array(cacheLength * h);
  const outProbs = new Float32Array(cacheLength * s);
  picked.forEach((index, row) => {
    const frame = index === sentinel ? numFrames : Math.min(index % scored, numFrames);
    if (frame >= numFrames) {
      outEmbeds.set(silenceEmbeds.subarray(0, h), row * h);
      return;
    }
    outEmbeds.set(embeds.subarray(frame * h, (frame + 1) * h), row * h);
    outProbs.set(probs.subarray(frame * s, (frame + 1) * s), row * s);
  });
  return { embeds: outEmbeds, probs: outProbs };
}
