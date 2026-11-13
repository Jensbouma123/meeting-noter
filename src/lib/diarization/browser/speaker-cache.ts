import { DEFAULT_SPEAKER_CACHE_CONFIG } from './constants';
import {
  compressFrames,
  compressionBudget,
  poolProbsToEncoderRate,
  scoreFrames,
} from './speaker-cache-compression';
import type {
  CompressedFrames,
  CompressionBudget,
  SpeakerCacheConfig,
  SpeakerCacheSnapshot,
} from './types';

export class SpeakerCache {
  readonly config: SpeakerCacheConfig;
  private readonly budget: CompressionBudget;

  private embeds: Float32Array;
  private probs: Float32Array;
  private fifo: Float32Array;
  private fifoProbs: Float32Array;
  private silence: Float32Array | null = null;
  private numCache = 0;
  private numFifo = 0;
  private compressed = false;

  constructor(config: Partial<SpeakerCacheConfig> = {}) {
    this.config = { ...DEFAULT_SPEAKER_CACHE_CONFIG, ...config };
    const c = this.config;
    this.budget = compressionBudget(c);
    this.embeds = new Float32Array(c.cacheLength * c.hiddenSize);
    this.probs = new Float32Array(c.cacheLength * c.numSpeakers);
    this.fifo = new Float32Array(c.fifoLength * c.hiddenSize);
    this.fifoProbs = new Float32Array(c.fifoLength * c.numSpeakers);
  }

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

  get numCachedFrames(): number {
    return this.numCache + this.numFifo;
  }

  getEmbeds(): Float32Array {
    const h = this.config.hiddenSize;
    const out = new Float32Array((this.numCache + this.numFifo) * h);
    out.set(this.embeds.subarray(0, this.numCache * h));
    out.set(this.fifo.subarray(0, this.numFifo * h), this.numCache * h);
    return out;
  }

  getCacheProbs(): Float32Array {
    return this.probs.slice(0, this.numCache * this.config.numSpeakers);
  }

  frameScores(probs: Float32Array, numFrames: number): Float64Array {
    return scoreFrames(probs, numFrames, this.config, this.budget.minPositiveScores);
  }

  update(
    chunkEmbeds: Float32Array,
    logits: Float32Array,
    silenceEmbeds: Float32Array,
    numChunkFrames: number,
  ): void {
    const { hiddenSize: h, numSpeakers: s, fifoLength, updatePeriod, cacheLength } = this.config;
    const numCache = this.numCache;
    const numFifo = this.numFifo;
    const probs = poolProbsToEncoderRate(logits, this.config);
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
    this.fifoProbs.fill(0);
    this.fifoProbs.set(probs.subarray((numCache + popped) * s, (numCache + fifoLen) * s));
  }

  private compress(
    embeds: Float32Array,
    probs: Float32Array,
    numFrames: number,
    silenceEmbeds: Float32Array,
  ): CompressedFrames {
    return compressFrames(embeds, probs, numFrames, silenceEmbeds, this.config, this.budget);
  }
}
