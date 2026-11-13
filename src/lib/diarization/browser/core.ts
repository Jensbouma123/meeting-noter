import {
  DEFAULT_MAX_GAP_SEC,
  DEFAULT_MODE,
  DEFAULT_OFF_THRESHOLD,
  DEFAULT_ON_THRESHOLD,
  DEFAULT_OVERLAP_THRESHOLD,
} from './constants';
import { chunkProbabilities, spanToSpeakerTurn } from './core-helpers';
import { FRAME_SEC, HIDDEN_SIZE, NUM_SPEAKERS, SUBSAMPLING_FACTOR } from './manifest';
import { MelFrameBuffer } from './mel-frame-buffer';
import { MelFrontend } from './mel';
import { SpeakerCache } from './speaker-cache';
import { TurnTracker } from './turns';
import type {
  DiarizerCoreOptions,
  SortformerRunner,
  Source,
  SpeakerCacheSnapshot,
  SpeakerTurn,
  StreamingMode,
  TurnSpan,
} from './types';

export class DiarizerCore {
  private readonly source: Source;
  private readonly model: SortformerRunner;
  private readonly mode: StreamingMode;
  private readonly mel = new MelFrontend();
  private readonly cache: SpeakerCache;
  private readonly tracker: TurnTracker;
  private readonly onProbabilities?: (probs: Float32Array, firstFrame: number) => void;
  private readonly onStep?: (audioSec: number, inferMs: number) => void;

  private readonly frames = new MelFrameBuffer();
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

  push(chunk: Float32Array, startSample?: number): void {
    if (this.disposed || this.finished || chunk.length === 0) return;
    if (this.originSample === null) this.originSample = startSample ?? 0;
    this.frames.append(this.mel.push(chunk));
    this.schedule();
  }

  async flush(): Promise<void> {
    if (this.disposed || this.finished) return;
    this.finished = true;
    this.frames.append(this.mel.finish());
    await this.running;
    await this.drain(true);
    if (this.disposed) return;
    this.emit(this.tracker.flush());
  }

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

  private async drain(final: boolean): Promise<void> {
    const chunkFrames = this.mode.chunkLength * SUBSAMPLING_FACTOR;
    for (;;) {
      if (this.disposed) return;
      const available = this.frames.endFrame - this.cursor;
      if (available <= 0) return;
      if (available < this.stepFrames && !final) return;
      const inputFrames = Math.min(available, this.stepFrames);
      const ownFrames = Math.min(inputFrames, chunkFrames);
      await this.step(inputFrames, ownFrames);
    }
  }

  private async step(inputFrames: number, ownFrames: number): Promise<void> {
    const features = this.frames.slice(this.cursor, inputFrames);
    const numCached = this.cache.numCachedFrames;
    const cached = this.cache.getEmbeds();
    const startedAt = this.onStep ? performance.now() : 0;
    const out = await this.model.run(features, inputFrames, cached, numCached);
    if (this.disposed) return;
    this.onStep?.(ownFrames * FRAME_SEC, performance.now() - startedAt);

    const ownEmbedFrames = Math.ceil(ownFrames / SUBSAMPLING_FACTOR);
    this.cache.update(out.chunkEmbeds, out.logits, out.silenceEmbeds, ownEmbedFrames);

    const probs = chunkProbabilities(out.logits, numCached * SUBSAMPLING_FACTOR, ownFrames);
    this.onProbabilities?.(probs, this.cursor);

    this.cursor += ownFrames;
    this.frames.dropBefore(this.cursor);
    this.emit(this.tracker.push(probs));
  }

  private emit(spans: TurnSpan[]): void {
    for (const span of spans) {
      const turn = spanToSpeakerTurn(span, this.source, this.originSample);
      for (const cb of this.listeners) cb(turn);
    }
  }
}
