/**
 * Streaming state of Nemotron-3-Diarization: the Arrival-Order Speaker Cache
 * (AOSC) and the FIFO queue of the most recent encoder frames, which every
 * chunk attends to. The ONNX graph is stateless — it takes these frames in as
 * `cached_embeds` — so this bookkeeping runs here.
 *
 * A port of transformers' `Nemotron3DiarizationSpeakerCache`, itself the
 * synchronous path of NeMo's `SortformerModules.streaming_update` /
 * `_compress_spkcache` with a learned silence embedding
 * (`use_learnable_sil_emb`):
 *  - each step's chunk frames join the FIFO; once it overflows, its oldest
 *    `max(updatePeriod, overflow)` frames move to the speaker cache;
 *  - once the cache overflows, it is compressed back to `cacheLength` frames:
 *    per speaker, the frames that most confidently hold that speaker alone,
 *    kept in their original order and grouped by speaker, each group ending
 *    in one silence frame.
 *
 * Frames are rows of `hiddenSize` floats; probabilities rows of `numSpeakers`.
 */

export interface SpeakerCacheConfig {
  fifoLength: number;
  cacheLength: number;
  updatePeriod: number;
  numSpeakers: number;
  hiddenSize: number;
  subsamplingFactor: number;
  silenceFramesPerSpeaker: number;
  predictionScoreThreshold: number;
  latestFramesScoreBoost: number;
  minPositiveScoresRate: number;
  strongBoostRate: number;
  weakBoostRate: number;
}

/** `streaming_config` of the repo's config.json. */
export const DEFAULT_SPEAKER_CACHE_CONFIG: SpeakerCacheConfig = Object.freeze({
  fifoLength: 264,
  cacheLength: 264,
  updatePeriod: 222,
  numSpeakers: 8,
  hiddenSize: 512,
  subsamplingFactor: 8,
  silenceFramesPerSpeaker: 1,
  predictionScoreThreshold: 0.25,
  latestFramesScoreBoost: 0.05,
  minPositiveScoresRate: 0.5,
  strongBoostRate: 0.75,
  weakBoostRate: 1.5,
});

const LOG_HALF = Math.log(0.5);

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Everything a later recording needs to keep the speakers apart the way this
 * one did: the cache frames every chunk attends to, FIFO included. The model
 * numbers speakers by their order of arrival in those frames, so a stream
 * that starts from them gives each returning voice its old channel.
 */
export interface SpeakerCacheSnapshot {
  /** Rows in `embeds` and `probs`, at most `cacheLength`. */
  numFrames: number;
  compressed: boolean;
  /** (numFrames, hiddenSize), row-major. */
  embeds: Float32Array;
  /** (numFrames, numSpeakers), row-major. */
  probs: Float32Array;
}

/** Indices of the `k` largest values, ties to the lower index. */
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

export class SpeakerCache {
  readonly config: SpeakerCacheConfig;
  private readonly minPositiveScores: number;
  private readonly numStrongBoosted: number;
  private readonly numWeakBoosted: number;

  private embeds: Float32Array;
  private probs: Float32Array;
  private fifo: Float32Array;
  /** The FIFO frames' probabilities from the step that last saw them. */
  private fifoProbs: Float32Array;
  private silence: Float32Array | null = null;
  private numCache = 0;
  private numFifo = 0;
  private compressed = false;

  constructor(config: Partial<SpeakerCacheConfig> = {}) {
    this.config = { ...DEFAULT_SPEAKER_CACHE_CONFIG, ...config };
    const c = this.config;
    const budget = Math.floor(c.cacheLength / c.numSpeakers) - c.silenceFramesPerSpeaker;
    this.minPositiveScores = Math.floor(budget * c.minPositiveScoresRate);
    this.numStrongBoosted = Math.floor(budget * c.strongBoostRate);
    this.numWeakBoosted = Math.floor(budget * c.weakBoostRate);
    this.embeds = new Float32Array(c.cacheLength * c.hiddenSize);
    this.probs = new Float32Array(c.cacheLength * c.numSpeakers);
    this.fifo = new Float32Array(c.fifoLength * c.hiddenSize);
    this.fifoProbs = new Float32Array(c.fifoLength * c.numSpeakers);
  }

  /**
   * The state to carry into a later stream. The FIFO is folded into the
   * cache (compressed, if together they overflow it), so the snapshot fits
   * `cacheLength` whatever FIFO the next stream uses.
   */
  snapshot(): SpeakerCacheSnapshot {
    const { hiddenSize: h, numSpeakers: s, cacheLength } = this.config;
    const numFrames = this.numCache + this.numFifo;
    const embeds = this.getEmbeds();
    const probs = new Float32Array(numFrames * s);
    probs.set(this.probs.subarray(0, this.numCache * s));
    probs.set(this.fifoProbs.subarray(0, this.numFifo * s), this.numCache * s);
    if (numFrames <= cacheLength) return { numFrames, compressed: this.compressed, embeds, probs };
    const out = this.compress(embeds, probs, numFrames, this.silence ?? new Float32Array(h));
    return { numFrames: cacheLength, compressed: true, embeds: out.embeds, probs: out.probs };
  }

  /** Start from `snapshot` instead of an empty cache. False, changing
   *  nothing, when it does not fit this cache's shape. */
  restore(snapshot: SpeakerCacheSnapshot): boolean {
    const { hiddenSize: h, numSpeakers: s, cacheLength } = this.config;
    const n = snapshot.numFrames;
    if (!Number.isInteger(n) || n < 0 || n > cacheLength) return false;
    if (snapshot.embeds.length !== n * h || snapshot.probs.length !== n * s) return false;
    this.embeds.fill(0).set(snapshot.embeds);
    this.probs.fill(0).set(snapshot.probs);
    this.numCache = n;
    this.numFifo = 0;
    this.compressed = snapshot.compressed;
    return true;
  }

  get cacheFrames(): number {
    return this.numCache;
  }

  get fifoFrames(): number {
    return this.numFifo;
  }

  get isCompressed(): boolean {
    return this.compressed;
  }

  /** Frames every chunk attends to: the cache, then the FIFO. */
  get numCachedFrames(): number {
    return this.numCache + this.numFifo;
  }

  /** `cached_embeds` for the next step, row-major (numCachedFrames, hiddenSize). */
  getEmbeds(): Float32Array {
    const h = this.config.hiddenSize;
    const out = new Float32Array((this.numCache + this.numFifo) * h);
    out.set(this.embeds.subarray(0, this.numCache * h));
    out.set(this.fifo.subarray(0, this.numFifo * h), this.numCache * h);
    return out;
  }

  /** The speaker probabilities stored alongside the cache frames. */
  getCacheProbs(): Float32Array {
    return this.probs.slice(0, this.numCache * this.config.numSpeakers);
  }

  /**
   * Push one processed step.
   *
   * @param chunkEmbeds The step's `chunk_embeds` output: its chunk frames,
   *   then its look-ahead frames (which are fed again next step, so they do
   *   not join the FIFO).
   * @param logits The step's `logits`, (numInputFrames * subsampling, numSpeakers).
   * @param silenceEmbeds The learned silence embedding.
   * @param numChunkFrames How many leading `chunkEmbeds` frames are chunk frames.
   */
  update(
    chunkEmbeds: Float32Array,
    logits: Float32Array,
    silenceEmbeds: Float32Array,
    numChunkFrames: number,
  ): void {
    const { hiddenSize: h, numSpeakers: s, fifoLength, updatePeriod, cacheLength } = this.config;
    const numCache = this.numCache;
    const numFifo = this.numFifo;
    const probs = this.poolProbs(logits);
    this.silence ??= silenceEmbeds.slice(0, h);

    const fifoLen = numFifo + numChunkFrames;
    const fifoEmbeds = new Float32Array(fifoLen * h);
    fifoEmbeds.set(this.fifo.subarray(0, numFifo * h));
    fifoEmbeds.set(chunkEmbeds.subarray(0, numChunkFrames * h), numFifo * h);

    const popped = fifoLen <= fifoLength ? 0 : Math.min(Math.max(updatePeriod, fifoLen - fifoLength), fifoLen);
    let remaining = fifoEmbeds;
    let remainingLen = fifoLen;
    if (popped > 0) {
      const newCacheLen = numCache + popped;
      let cacheEmbeds: Float32Array = new Float32Array(newCacheLen * h);
      let cacheProbs: Float32Array = new Float32Array(newCacheLen * s);
      cacheEmbeds.set(this.embeds.subarray(0, numCache * h));
      cacheEmbeds.set(fifoEmbeds.subarray(0, popped * h), numCache * h);
      // An uncompressed cache still holds plain chunk frames, whose
      // probabilities this step re-estimates; a compressed one is out of
      // order, so the probabilities stored with its frames are the only ones.
      const stored = this.compressed ? this.probs : probs;
      cacheProbs.set(stored.subarray(0, numCache * s));
      cacheProbs.set(probs.subarray(numCache * s, (numCache + popped) * s), numCache * s);

      let cacheLen = newCacheLen;
      if (cacheLen > cacheLength) {
        const out = this.compress(cacheEmbeds, cacheProbs, cacheLen, silenceEmbeds);
        cacheEmbeds = out.embeds;
        cacheProbs = out.probs;
        cacheLen = cacheLength;
        this.compressed = true;
      }
      this.embeds.set(cacheEmbeds.subarray(0, cacheLen * h));
      this.probs.set(cacheProbs.subarray(0, cacheLen * s));
      this.numCache = cacheLen;
      remaining = fifoEmbeds.subarray(popped * h);
      remainingLen = fifoLen - popped;
    }
    this.fifo.set(remaining.subarray(0, remainingLen * h));
    this.numFifo = remainingLen;
    // FIFO row i was input row numCache + popped + i this step.
    this.fifoProbs.fill(0);
    this.fifoProbs.set(probs.subarray((numCache + popped) * s, (numCache + fifoLen) * s));
  }

  /** Speaker probabilities at the encoder frame rate: sigmoid, then the mean
   *  of each `subsamplingFactor` group (`avg_pool1d`). */
  private poolProbs(logits: Float32Array): Float32Array {
    const { numSpeakers: s, subsamplingFactor: f } = this.config;
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

  /** Per-frame, per-speaker importance: high for confident, non-overlapped
   *  speech of that speaker; -Infinity for frames not worth keeping. */
  frameScores(probs: Float32Array, numFrames: number): Float64Array {
    const s = this.config.numSpeakers;
    const threshold = this.config.predictionScoreThreshold;
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
    // Drop non-positive (usually overlapped) speech frames of a speaker once
    // it has enough positive ones.
    for (let k = 0; k < s; k += 1) {
      let positives = 0;
      for (let t = 0; t < numFrames; t += 1) if (scores[t * s + k] > 0) positives += 1;
      if (positives < this.minPositiveScores) continue;
      for (let t = 0; t < numFrames; t += 1) {
        const i = t * s + k;
        if (probs[i] > 0.5 && !(scores[i] > 0)) scores[i] = -Infinity;
      }
    }
    return scores;
  }

  private boost(scores: Float64Array, numFrames: number, count: number, amount: number): void {
    const s = this.config.numSpeakers;
    const column = new Float64Array(numFrames);
    for (let k = 0; k < s; k += 1) {
      for (let t = 0; t < numFrames; t += 1) column[t] = scores[t * s + k];
      for (const t of topKIndices(column, count)) scores[t * s + k] += amount;
    }
  }

  private compress(
    embeds: Float32Array,
    probs: Float32Array,
    numFrames: number,
    silenceEmbeds: Float32Array,
  ): { embeds: Float32Array; probs: Float32Array } {
    const { numSpeakers: s, hiddenSize: h, cacheLength, silenceFramesPerSpeaker } = this.config;
    const scores = this.frameScores(probs, numFrames);
    // Frames past the cache capacity are the ones just popped from the FIFO.
    for (let i = cacheLength * s; i < numFrames * s; i += 1) scores[i] += this.config.latestFramesScoreBoost;
    this.boost(scores, numFrames, this.numStrongBoosted, -2 * LOG_HALF);
    this.boost(scores, numFrames, this.numWeakBoosted, -LOG_HALF);

    // Speaker-major flattening, with the silence frames (always kept) after
    // each speaker's own frames.
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
}
