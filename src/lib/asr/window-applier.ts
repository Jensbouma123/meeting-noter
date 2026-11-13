import type { LiveAudioBuffer } from './live-audio-buffer';
import type { OpenSegment } from './open-segment';
import type { LiveChunkerConfig, LiveSegmentUpdate, LiveWindowRequest, TimelineWord } from './types';
import { cutBetween, planCommit } from './window-words';

export class WindowApplier {
  constructor(
    private readonly segment: OpenSegment,
    private readonly buffer: LiveAudioBuffer,
    private readonly cfg: LiveChunkerConfig,
    private readonly closeSegment: (updates: LiveSegmentUpdate[], end: number) => void,
  ) {}

  splitAtTurn(ws: TimelineWord[], turnEnd: number | undefined, winEnd: number, updates: LiveSegmentUpdate[]): boolean {
    const openStart = this.segment.firstWordStart ?? this.buffer.startSample;
    const split = turnEnd !== undefined && turnEnd > openStart && turnEnd < winEnd;
    const before = split ? ws.filter((w) => (w.start + w.end) / 2 <= turnEnd).length : 0;
    if (!split || (before === 0 && this.segment.words.length === 0)) return false;
    this.segment.words.push(...ws.slice(0, before));
    this.segment.hyp = [];
    this.closeSegment(updates, turnEnd);
    const rest = ws.slice(before);
    this.buffer.dropBefore(rest.length > 0 ? Math.min(turnEnd, rest[0].start) : turnEnd);
    this.segment.beforeCut = before > 0 ? ws[before - 1] : null;
    this.segment.hyp = rest;
    return true;
  }

  commitSettled(req: LiveWindowRequest, ws: TimelineWord[], updates: LiveSegmentUpdate[]): void {
    const { count, discardBefore } = planCommit(req, ws, this.segment.hyp, this.cfg);
    if (discardBefore !== null) this.buffer.dropBefore(discardBefore);
    if (count === 0) {
      this.segment.hyp = ws;
      return;
    }
    const last = ws[count - 1];
    this.segment.words.push(...ws.slice(0, count));
    this.buffer.dropBefore(cutBetween(last, ws[count]));
    this.segment.beforeCut = last;
    this.segment.hyp = ws.slice(count);
    if (last.end - this.segment.words[0].start >= this.cfg.maxSegmentSamples) {
      const rest = this.segment.hyp;
      this.segment.hyp = [];
      this.closeSegment(updates, last.end);
      this.segment.hyp = rest;
      this.segment.beforeCut = last;
    }
  }
}
