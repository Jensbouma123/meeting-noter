import type { OpenRun, TurnSpan, TurnTrackerOptions } from './types';

export class TurnTracker {
  private readonly numSpeakers: number;
  private readonly frameSec: number;
  private readonly threshold: number;
  private readonly offThreshold: number;
  private readonly overlapThreshold: number;
  private readonly maxGapFrames: number;
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
    this.minTurnFrames = Math.round((options.minTurnSec ?? 0.2) / options.frameSec);
    this.maxOpenFrames = Math.round((options.maxOpenSec ?? 8) / options.frameSec);
    this.provisional = options.provisional ?? false;
    this.open = new Array<OpenRun | null>(options.numSpeakers).fill(null);
  }

  get framesSeen(): number {
    return this.nextFrame;
  }

  push(probs: Float32Array): TurnSpan[] {
    const s = this.numSpeakers;
    const frames = Math.floor(probs.length / s);
    const closed: TurnSpan[] = [];
    for (let i = 0; i < frames; i += 1) {
      const frame = this.nextFrame + i;
      let others = 0;
      for (let k = 0; k < s; k += 1) if (this.open[k]?.lastActive === frame - 1) others += 1;
      for (let k = 0; k < s; k += 1) {
        const run = this.open[k];
        const p = probs[i * s + k];
        const on = run !== null && run.lastActive === frame - 1;
        const onset = others > (on ? 1 : 0) ? this.overlapThreshold : this.threshold;
        if (p > onset || (on && p > this.offThreshold)) {
          if (!run) {
            this.open[k] = this.openRun(frame, frame, false);
          } else {
            run.lastActive = frame;
            if (frame + 1 - run.startFrame >= this.maxOpenFrames) {
              closed.push({ ...this.span(k, run, frame + 1, true), continues: true });
              this.open[k] = this.openRun(frame + 1, frame, true);
            }
          }
        } else if (run && frame - run.lastActive > this.maxGapFrames) {
          this.close(k, closed);
        }
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
    return { id: this.nextRun++, startFrame, lastActive, continued, reportedEnd: startFrame };
  }

  private span(speaker: number, run: OpenRun, endFrame: number, final: boolean): TurnSpan {
    return { speaker, start: run.startFrame * this.frameSec, end: endFrame * this.frameSec, run: run.id, final };
  }
}
