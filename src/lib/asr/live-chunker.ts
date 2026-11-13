import { DEFAULT_LIVE_CHUNKER_CONFIG } from './live-chunker-defaults';
import { LiveAudioBuffer } from './live-audio-buffer';
import { isNoiseText } from './noise-text';
import { OpenSegment } from './open-segment';
import { SpeechGate } from './speech-gate';
import type { LiveChunkerConfig, LiveSegmentUpdate, LiveWindowRequest, TimedWord } from './types';
import { WindowApplier } from './window-applier';
import { recognisedWords } from './window-words';

export class LiveChunker {
  private readonly cfg: LiveChunkerConfig;
  private readonly gate: SpeechGate;
  private readonly buffer = new LiveAudioBuffer();
  private readonly segment: OpenSegment;
  private readonly applier: WindowApplier;
  private earlyTailTaken = false;
  private firstTaken = false;
  private speechFrameCount = 0;
  private inFlight = false;

  constructor(newId: () => string, cfg: Partial<LiveChunkerConfig> = {}) {
    this.cfg = { ...DEFAULT_LIVE_CHUNKER_CONFIG, ...cfg };
    this.gate = new SpeechGate(this.cfg);
    this.segment = new OpenSegment(newId, this.cfg);
    this.applier = new WindowApplier(this.segment, this.buffer, this.cfg, (updates, end) => this.closeSegment(updates, end));
  }

  get buffered(): number {
    return this.buffer.length;
  }

  get bufferedSamples(): number {
    return this.buffer.length;
  }

  get noiseFloor(): number {
    return this.gate.noiseFloor;
  }

  get speechFrames(): number {
    return this.speechFrameCount;
  }

  get openStartSample(): number {
    return this.segment.firstWordStart ?? this.buffer.startSample;
  }

  get busy(): boolean {
    return this.inFlight;
  }

  push(samples: Float32Array, at?: number): void {
    if (samples.length === 0) return;
    const frame = this.gate.push(samples);
    if (frame.speech) this.speechFrameCount += 1;
    const quiet = frame.quiet || (this.cfg.pauseWhenUnvoiced && !frame.voiced);
    this.buffer.append(samples, frame.speech, quiet, at);
    if (!quiet) this.earlyTailTaken = false;
    const end = this.buffer.startSample + this.buffer.length;
    if (!this.buffer.hasVoice && !this.inFlight && !this.segment.isOpen) {
      this.buffer.dropBefore(end - this.cfg.leadInSamples - frame.runSamples);
    }
    const cap = this.cfg.maxWindowSamples * 2;
    if (this.buffer.length > cap) this.buffer.dropBefore(end - cap);
  }

  due(): boolean {
    if (this.inFlight || this.buffer.length === 0) return false;
    if (!this.buffer.hasVoice && !this.segment.isOpen) return false;
    const step = this.segment.isOpen || this.firstTaken ? this.cfg.stepSamples : this.cfg.firstStepSamples;
    if (this.buffer.hasVoice && this.buffer.sinceTake >= step) return true;
    if (this.buffer.sinceTake > 0 && this.buffer.trailingQuiet >= this.cfg.pauseSamples) return true;
    return this.earlyTailDue();
  }

  take(force = false): LiveWindowRequest | null {
    if (this.inFlight || this.buffer.length === 0) return null;
    if (!this.buffer.hasVoice && !this.segment.isOpen) return null;
    const size = Math.min(this.buffer.length, this.cfg.maxWindowSamples);
    const audio = this.buffer.readWindow(size);
    const final = size === this.buffer.length && (force || this.buffer.trailingQuiet >= this.cfg.pauseSamples);
    if (this.buffer.trailingQuiet >= this.cfg.earlyTailSamples) this.earlyTailTaken = true;
    this.firstTaken = true;
    this.inFlight = true;
    this.buffer.markTaken();
    return { audio, startSample: this.buffer.startSample, final };
  }

  abort(): void {
    this.inFlight = false;
    if (!this.segment.isOpen) this.firstTaken = false;
  }

  apply(req: LiveWindowRequest, words: readonly TimedWord[], turnEnd?: number): LiveSegmentUpdate[] {
    this.inFlight = false;
    const winEnd = req.startSample + req.audio.length;
    let ws = recognisedWords(req, words, this.segment.beforeCut);
    if (this.segment.words.length === 0 && isNoiseText(ws, this.cfg)) ws = [];
    const updates: LiveSegmentUpdate[] = [];
    if (req.final) {
      this.segment.words.push(...ws);
      this.segment.hyp = [];
      this.closeSegment(updates, winEnd);
      this.buffer.dropBefore(winEnd);
      return updates;
    }
    if (!this.applier.splitAtTurn(ws, turnEnd, winEnd, updates)) this.applier.commitSettled(req, ws, updates);
    this.segment.show(updates, winEnd);
    return updates;
  }

  finish(): LiveSegmentUpdate[] {
    const updates: LiveSegmentUpdate[] = [];
    const end = this.buffer.startSample + this.buffer.length;
    if (this.segment.isOpen) this.closeSegment(updates, end);
    this.buffer.dropBefore(end);
    this.inFlight = false;
    return updates;
  }

  reset(): void {
    this.buffer.reset();
    this.earlyTailTaken = false;
    this.firstTaken = false;
    this.gate.reset();
    this.inFlight = false;
    this.segment.clear();
  }

  private earlyTailDue(): boolean {
    const { earlyTailSamples, pauseSamples } = this.cfg;
    return (
      earlyTailSamples > 0 &&
      !this.earlyTailTaken &&
      this.buffer.hasVoice &&
      this.buffer.sinceTake > 0 &&
      this.buffer.trailingQuiet >= earlyTailSamples &&
      this.buffer.trailingQuiet < pauseSamples
    );
  }

  private closeSegment(updates: LiveSegmentUpdate[], end: number): void {
    this.segment.close(updates, end, this.buffer.startSample);
    this.firstTaken = false;
  }
}
