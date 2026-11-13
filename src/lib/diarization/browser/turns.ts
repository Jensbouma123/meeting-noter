/**
 * Per-frame speaker probabilities → closed speaker turns, incrementally.
 *
 * Each of the model's speaker channels is tracked on its own, so overlapping
 * speech gives overlapping turns. A channel's run opens at its first frame
 * above `threshold` (above `overlapThreshold` instead while another channel
 * is on, since the second speaker's probability sags under the louder one's;
 * default: `threshold`) and stays on while it is above `offThreshold`
 * (default: `threshold`); once off, it closes after staying off for more than
 * `maxGapSec` (default 1 s: one person's pauses between phrases do not split
 * their turn; on the AMI scoring clip this took DER from 43% to 35%). A run
 * shorter than `minTurnSec` is dropped as a blip. A run still open after
 * `maxOpenSec` is emitted up to the current frame and continues as a new
 * turn, so a long monologue is labelled while it is still going.
 *
 * With `provisional`, every push also reports each open run as it stands
 * (`final: false`), under the id its closing span will carry: the caller
 * learns who is speaking within one step instead of after the turn ends.
 *
 * Frame `f` covers `[f, f + 1) * frameSec` on the tracker's own clock.
 */

export interface TurnSpan {
  speaker: number;
  /** Seconds on the tracker's clock. */
  start: number;
  end: number;
  /** Identifies the run: a provisional span and its later final one share it. */
  run: number;
  /** False while the run is still open and may grow. */
  final: boolean;
  /** Set on a span cut off at `maxOpenSec`: the speaker goes on talking, so
   *  its end is no turn end. */
  continues?: true;
}

export interface TurnTrackerOptions {
  numSpeakers: number;
  frameSec: number;
  threshold?: number;
  /** A channel already on stays on down to this (hysteresis). */
  offThreshold?: number;
  /** Where a channel turns on while another one was on in the previous frame. */
  overlapThreshold?: number;
  maxGapSec?: number;
  minTurnSec?: number;
  maxOpenSec?: number;
  /** Also report open runs after every push (see the module doc). */
  provisional?: boolean;
}

interface OpenRun {
  id: number;
  startFrame: number;
  /** End frame of the last provisional span reported for this run. */
  reportedEnd: number;
  /** Last frame above threshold. */
  lastActive: number;
  /** Continues a force-flushed run: kept however short it is, since its
   *  start is the previous turn's end rather than a blip. */
  continued: boolean;
}

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

  /** Frames seen so far. */
  get framesSeen(): number {
    return this.nextFrame;
  }

  /**
   * Feed consecutive frames of probabilities, row-major (frames, numSpeakers).
   * Returns the turns they closed, by start time, then (with `provisional`)
   * the open runs that grew, the most recently active last.
   */
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
    const growing: TurnSpan[] = [];
    for (let k = 0; k < s; k += 1) {
      const run = this.open[k];
      if (!run || !this.reportable(run) || run.lastActive + 1 <= run.reportedEnd) continue;
      run.reportedEnd = run.lastActive + 1;
      growing.push(this.span(k, run, run.reportedEnd, false));
    }
    return closed.concat(growing.sort((a, b) => a.end - b.end));
  }

  /** Close every open run (end of stream). */
  flush(): TurnSpan[] {
    const closed: TurnSpan[] = [];
    for (let k = 0; k < this.numSpeakers; k += 1) this.close(k, closed);
    return closed.sort((a, b) => a.start - b.start);
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
