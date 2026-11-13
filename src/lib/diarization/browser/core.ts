/**
 * Streaming diarization engine for one audio source: Nemotron-3-Diarization
 * (Streaming Sortformer) run chunk by chunk.
 *
 * Per step, mirroring transformers'
 * `Nemotron3DiarizationForAudioFrameClassification.forward` in streaming mode:
 *  1. `mel.ts` turns pushed audio into 10 ms log-mel frames.
 *  2. Once `chunkLength + rightContext` encoder frames (8 mel frames each) are
 *     buffered past the cursor, they run through the model together with the
 *     speaker cache + FIFO frames (`speaker-cache.ts`) as `cached_embeds`.
 *  3. The logits of the `chunkLength` chunk frames — after the cached frames,
 *     before the look-ahead — are this step's output. The look-ahead frames
 *     open the next step, so the cursor advances by `chunkLength` only.
 *  4. The chunk's embeddings join the FIFO (and, from there, the cache).
 *  5. `turns.ts` turns the chunk's per-frame speaker probabilities into
 *     closed turns, one channel per arrival-ordered speaker: `${source}:${k}`.
 *
 * Model access is injected (`SortformerRunner`), so the scheduling, cache and
 * timing logic is unit-tested without ONNX Runtime (see `core.test.ts`).
 */

import {
  FRAME_SEC,
  HIDDEN_SIZE,
  NUM_MEL_BINS,
  NUM_SPEAKERS,
  SAMPLE_RATE,
  SUBSAMPLING_FACTOR,
} from './manifest';
import { MelFrontend } from './mel';
import { SpeakerCache, type SpeakerCacheConfig, type SpeakerCacheSnapshot } from './speaker-cache';
import { TurnTracker, type TurnSpan, type TurnTrackerOptions } from './turns';
import type { Source, SpeakerTurn } from './types';

export interface SortformerOutput {
  /** ((numCached + chunk encoder frames) * 8, NUM_SPEAKERS) logits. */
  logits: Float32Array;
  /** (chunk encoder frames, HIDDEN_SIZE): the chunk's own embeddings. */
  chunkEmbeds: Float32Array;
  /** (HIDDEN_SIZE): the learned silence embedding. */
  silenceEmbeds: Float32Array;
}

export interface SortformerRunner {
  run(
    features: Float32Array,
    numMelFrames: number,
    cachedEmbeds: Float32Array,
    numCachedFrames: number,
  ): Promise<SortformerOutput>;
}

/** Chunking, in encoder frames (80 ms each). */
export interface StreamingMode {
  chunkLength: number;
  rightContext: number;
  /** FIFO capacity; the speaker cache itself is always 264 frames. */
  fifoLength: number;
  updatePeriod: number;
}

/** The model card's `low_latency` mode (0.72 s chunks, 1.04 s buffer). One
 *  step attends to up to 541 frames — about 0.25 s on a laptop WebGPU. */
export const LOW_LATENCY_MODE: StreamingMode = Object.freeze({
  chunkLength: 9,
  rightContext: 4,
  fifoLength: 264,
  updatePeriod: 222,
});

/**
 * 4 s chunks with a 0.64 s look-ahead and a short FIFO — the default.
 *
 * On WASM a step costs about as much as the model card's 0.72 s chunk (its
 * cost is the cache, not the chunk: ~2.5 s single-threaded), so small chunks
 * cannot keep up; 4 s ones do, with room for the speech model running
 * alongside. Turns are late by a few seconds either way (they are only
 * reported once closed), and the meeting layer relabels segments when they
 * arrive. Scored against the other modes in exchange/nemotron-browser-diarization.md.
 */
export const DEFAULT_MODE: StreamingMode = Object.freeze({
  chunkLength: 50,
  rightContext: 8,
  fifoLength: 188,
  updatePeriod: 144,
});

/**
 * `DEFAULT_MODE` with 2 s chunks, for WebGPU: a step costs about the same
 * (the cache dominates), which WebGPU runs well inside the chunk, so the
 * speaker is known 2.6 s after they speak at worst instead of 4.6 s.
 */
export const REALTIME_MODE: StreamingMode = Object.freeze({
  chunkLength: 25,
  rightContext: 8,
  fifoLength: 188,
  updatePeriod: 144,
});

export interface DiarizerCoreOptions {
  source: Source;
  model: SortformerRunner;
  mode?: StreamingMode;
  cache?: Partial<SpeakerCacheConfig>;
  /** A previous stream's speaker cache (`snapshotSpeakers`): its speakers
   *  keep their channels here. Ignored when it does not fit the cache. */
  speakerState?: SpeakerCacheSnapshot | null;
  turns?: Partial<Omit<TurnTrackerOptions, 'numSpeakers' | 'frameSec'>>;
  /** Called with each step's chunk probabilities (frames, NUM_SPEAKERS) —
   *  for scoring and debugging. */
  onProbabilities?: (probs: Float32Array, firstFrame: number) => void;
  /** Called after each step with its audio length and inference time. */
  onStep?: (audioSec: number, inferMs: number) => void;
}

/**
 * Turn postprocessing, tuned on AMI EN2002b (first 5 min, 10:00-20:00 and
 * 20:00-29:46; scored on 10 ms frames, DER without collar): the channels are
 * independent sigmoids, and during overlap the quieter speaker's probability
 * sags well below 0.5 while the louder one holds it. A channel already on
 * therefore turns off only below `DEFAULT_OFF_THRESHOLD`, and a second one
 * turns on above `DEFAULT_OVERLAP_THRESHOLD` while another is on, while a lone
 * speaker still needs `DEFAULT_ON_THRESHOLD` (which keeps false alarms down).
 * Gaps up to `DEFAULT_MAX_GAP_SEC` are bridged. Against a single 0.5 threshold
 * this took overlap-frame recall from 51% / 76% / 80% (0.1 off-threshold alone:
 * 62.5% / 85.7% / 80.0%) to 66.7% / 90.3% / 82.1%, with DER 31.6 / 7.6 / 19.9%
 * (0.1 alone: 31.8 / 8.2 / 20.0%). See exchange/sortformer-overlap.md.
 */
export const DEFAULT_ON_THRESHOLD = 0.55;
export const DEFAULT_OVERLAP_THRESHOLD = 0.4;
export const DEFAULT_OFF_THRESHOLD = 0.1;
export const DEFAULT_MAX_GAP_SEC = 1.1;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export class DiarizerCore {
  private readonly source: Source;
  private readonly model: SortformerRunner;
  private readonly mode: StreamingMode;
  private readonly mel = new MelFrontend();
  private readonly cache: SpeakerCache;
  private readonly tracker: TurnTracker;
  private readonly onProbabilities?: (probs: Float32Array, firstFrame: number) => void;
  private readonly onStep?: (audioSec: number, inferMs: number) => void;

  /** Mel frames from `framesStart` on, row-major. */
  private frames = new Float32Array(0);
  private framesStart = 0;
  private framesEnd = 0;
  /** First mel frame of the next chunk. */
  private cursor = 0;

  private originSample: number | null = null;
  private running: Promise<void> | null = null;
  private finished = false;
  private disposed = false;
  private readonly listeners = new Set<(turn: SpeakerTurn) => void>();

  constructor(options: DiarizerCoreOptions) {
    this.source = options.source;
    this.model = options.model;
    this.mode = options.mode ?? DEFAULT_MODE;
    this.cache = new SpeakerCache({
      fifoLength: this.mode.fifoLength,
      updatePeriod: this.mode.updatePeriod,
      numSpeakers: NUM_SPEAKERS,
      hiddenSize: HIDDEN_SIZE,
      subsamplingFactor: SUBSAMPLING_FACTOR,
      ...options.cache,
    });
    if (options.speakerState) this.cache.restore(options.speakerState);
    this.tracker = new TurnTracker({
      numSpeakers: NUM_SPEAKERS,
      frameSec: FRAME_SEC,
      threshold: DEFAULT_ON_THRESHOLD,
      overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
      offThreshold: DEFAULT_OFF_THRESHOLD,
      maxGapSec: DEFAULT_MAX_GAP_SEC,
      ...options.turns,
    });
    this.onProbabilities = options.onProbabilities;
    this.onStep = options.onStep;
  }

  onSpeakerTurn(cb: (turn: SpeakerTurn) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * @param startSample Where `chunk` starts on the caller's timeline. Read on
   *   the first push only: audio after it is contiguous, so it fixes the
   *   offset between this core's own sample count and the caller's clock.
   */
  push(chunk: Float32Array, startSample?: number): void {
    if (this.disposed || this.finished || chunk.length === 0) return;
    if (this.originSample === null) this.originSample = startSample ?? 0;
    this.appendFrames(this.mel.push(chunk));
    this.schedule();
  }

  /**
   * End of stream: score every remaining frame (the last chunk has no
   * look-ahead) and close every open turn. Later pushes are ignored.
   */
  async flush(): Promise<void> {
    if (this.disposed || this.finished) return;
    this.finished = true;
    this.appendFrames(this.mel.finish());
    await this.running;
    await this.drain(true);
    if (this.disposed) return;
    this.emit(this.tracker.flush());
  }

  /** The speaker cache as it stands, for a later stream to start from. */
  snapshotSpeakers(): SpeakerCacheSnapshot {
    return this.cache.snapshot();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private schedule(): void {
    if (this.running) return;
    this.running = this.drain(false).finally(() => {
      this.running = null;
    });
  }

  private get stepFrames(): number {
    return (this.mode.chunkLength + this.mode.rightContext) * SUBSAMPLING_FACTOR;
  }

  /** Run every step the buffered frames allow. At the end of the stream
   *  (`final`), that includes the short tail steps. */
  private async drain(final: boolean): Promise<void> {
    const chunkFrames = this.mode.chunkLength * SUBSAMPLING_FACTOR;
    for (;;) {
      if (this.disposed) return;
      const available = this.framesEnd - this.cursor;
      if (available <= 0) return;
      if (available < this.stepFrames && !final) return;
      const inputFrames = Math.min(available, this.stepFrames);
      const ownFrames = Math.min(inputFrames, chunkFrames);
      await this.step(inputFrames, ownFrames);
    }
  }

  private async step(inputFrames: number, ownFrames: number): Promise<void> {
    const features = this.frames.slice(
      (this.cursor - this.framesStart) * NUM_MEL_BINS,
      (this.cursor - this.framesStart + inputFrames) * NUM_MEL_BINS,
    );
    const numCached = this.cache.numCachedFrames;
    const cached = this.cache.getEmbeds();
    const startedAt = this.onStep ? performance.now() : 0;
    const out = await this.model.run(features, inputFrames, cached, numCached);
    if (this.disposed) return;
    this.onStep?.(ownFrames * FRAME_SEC, performance.now() - startedAt);

    const ownEmbedFrames = Math.ceil(ownFrames / SUBSAMPLING_FACTOR);
    this.cache.update(out.chunkEmbeds, out.logits, out.silenceEmbeds, ownEmbedFrames);

    const first = numCached * SUBSAMPLING_FACTOR;
    const probs = new Float32Array(ownFrames * NUM_SPEAKERS);
    for (let i = 0; i < probs.length; i += 1) probs[i] = sigmoid(out.logits[first * NUM_SPEAKERS + i]);
    this.onProbabilities?.(probs, this.cursor);

    this.cursor += ownFrames;
    this.dropConsumedFrames();
    this.emit(this.tracker.push(probs));
  }

  private emit(spans: TurnSpan[]): void {
    const originSec = (this.originSample ?? 0) / SAMPLE_RATE;
    for (const span of spans) {
      const turn: SpeakerTurn = {
        speaker: `${this.source}:${span.speaker}`,
        source: this.source,
        start: originSec + span.start,
        end: originSec + span.end,
        id: `${this.source}#${span.run}`,
        final: span.final,
        ...(span.continues ? { continues: true } : {}),
      };
      for (const cb of this.listeners) cb(turn);
    }
  }

  private appendFrames(newFrames: Float32Array): void {
    if (newFrames.length === 0) return;
    const used = (this.framesEnd - this.framesStart) * NUM_MEL_BINS;
    if (used + newFrames.length > this.frames.length) {
      const next = new Float32Array(Math.max(used + newFrames.length, this.frames.length * 2));
      next.set(this.frames.subarray(0, used));
      this.frames = next;
    }
    this.frames.set(newFrames, used);
    this.framesEnd += newFrames.length / NUM_MEL_BINS;
  }

  private dropConsumedFrames(): void {
    const drop = this.cursor - this.framesStart;
    if (drop <= 0) return;
    const used = (this.framesEnd - this.framesStart) * NUM_MEL_BINS;
    this.frames.copyWithin(0, drop * NUM_MEL_BINS, used);
    this.framesStart = this.cursor;
  }
}
