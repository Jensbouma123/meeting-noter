import type { OpenRun, TurnSpan, TurnTrackerOptions } from './types';

export class TurnTracker {
  private readonly numSpeakers: number;
  private readonly frameSec: number;
  private readonly threshold: number;
  private readonly offThreshold: number;
  private readonly overlapThreshold: number;
  private readonly maxGapFrames: number;
  private readonly pauseFrames: number;
  private readonly minTurnFrames: number;
  private readonly maxOpenFrames: number;
  private readonly provisional: boolean;
  private readonly open: (OpenRun | null)[];
  private nextFrame = 0;
  private nextRun = 0;

  constructor(options: TurnTrackerOptions) {
    this.numSpeakers = options.numSpeakers;
    this.frameSec = options.frameSec;
    this.threshold = options.threshold ?? 0.5;
    this.offThreshold = options.offThreshold ?? this.threshold;
    this.overlapThreshold = options.overlapThreshold ?? this.threshold;
    this.maxGapFrames = Math.round((options.maxGapSec ?? 1) / options.frameSec);
    this.pauseFrames = Math.round((options.pauseSec ?? Infinity) / options.frameSec);
    this.minTurnFrames = Math.round((options.minTurnSec ?? 0.2) / options.frameSec);
    this.maxOpenFrames = Math.round((options.maxOpenSec ?? 8) / options.frameSec);
    this.provisional = options.provisional ?? false;
    this.open = new Array<OpenRun | null>(options.numSpeakers).fill(null);
  }

  get framesSeen(): number {
    return this.nextFrame;
  }

  push(probs: Float32Array): TurnSpan[] {
    const speakers = this.numSpeakers;
    const frames = Math.floor(probs.length / speakers);
    const closed: TurnSpan[] = [];
    for (let i = 0; i < frames; i += 1) {
      const frame = this.nextFrame + i;
      const others = this.activeAt(frame - 1);
      for (let k = 0; k < speakers; k += 1) {
        this.step(k, frame, probs[i * speakers + k], others, closed);
      }
    }
    this.nextFrame += frames;
    closed.sort((a, b) => a.start - b.start);
    if (!this.provisional) return closed;
    return closed.concat(this.growingRuns());
  }

  flush(): TurnSpan[] {
    const closed: TurnSpan[] = [];
    for (let k = 0; k < this.numSpeakers; k += 1) this.close(k, closed);
    return closed.sort((a, b) => a.start - b.start);
  }

  private activeAt(frame: number): number {
    let count = 0;
    for (let k = 0; k < this.numSpeakers; k += 1) if (this.open[k]?.lastActive === frame) count += 1;
    return count;
  }

  private step(k: number, frame: number, p: number, others: number, closed: TurnSpan[]): void {
    const run = this.open[k];
    const on = run !== null && run.lastActive === frame - 1;
    const onset = others > (on ? 1 : 0) ? this.overlapThreshold : this.threshold;
    if (p > onset || (on && p > this.offThreshold)) {
      this.activate(k, run, frame, closed);
    } else if (run && frame - run.lastActive > this.maxGapFrames) {
      this.close(k, closed);
    }
  }

  private activate(k: number, run: OpenRun | null, frame: number, closed: TurnSpan[]): void {
    if (!run) {
      this.open[k] = this.openRun(frame, frame, false);
      return;
    }
    if (frame - run.lastActive - 1 > this.pauseFrames) run.pauses.push([run.lastActive + 1, frame]);
    run.lastActive = frame;
    if (frame + 1 - run.startFrame >= this.maxOpenFrames) this.splitRun(k, run, frame, closed);
  }

  private splitRun(k: number, run: OpenRun, frame: number, closed: TurnSpan[]): void {
    closed.push({ ...this.span(k, run, frame + 1, true), continues: true });
    this.open[k] = this.openRun(frame + 1, frame, true);
  }

  private growingRuns(): TurnSpan[] {
    const growing: TurnSpan[] = [];
    for (let k = 0; k < this.numSpeakers; k += 1) {
      const run = this.open[k];
      if (!run || !this.reportable(run) || run.lastActive + 1 <= run.reportedEnd) continue;
      run.reportedEnd = run.lastActive + 1;
      growing.push(this.span(k, run, run.reportedEnd, false));
    }
    return growing.sort((a, b) => a.end - b.end);
  }

  private close(speaker: number, into: TurnSpan[]): void {
    const run = this.open[speaker];
    this.open[speaker] = null;
    if (!run) return;
    if (this.reportable(run)) into.push(this.span(speaker, run, run.lastActive + 1, true));
  }

  private reportable(run: OpenRun): boolean {
    const end = run.lastActive + 1;
    return end > run.startFrame && (run.continued || end - run.startFrame >= this.minTurnFrames);
  }

  private openRun(startFrame: number, lastActive: number, continued: boolean): OpenRun {
    return { id: this.nextRun++, startFrame, lastActive, continued, reportedEnd: startFrame, pauses: [] };
  }

  private span(speaker: number, run: OpenRun, endFrame: number, final: boolean): TurnSpan {
    const span: TurnSpan = {
      speaker,
      start: run.startFrame * this.frameSec,
      end: endFrame * this.frameSec,
      run: run.id,
      final,
    };
    if (run.pauses.length > 0) span.pauses = run.pauses.map(([a, b]) => [a * this.frameSec, b * this.frameSec]);
    return span;
  }
}
