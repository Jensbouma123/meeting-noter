import type { AudioSpill } from './audio-spill';
import { HOP_SAMPLES, RESCORE_PARAMS, WINDOW_TAIL_SAMPLES } from './params';

const OWNER_THRESHOLD = 128;

export class RunSpiller {
  private audio = new Int16Array(HOP_SAMPLES * 100);
  private audioStart = 0;
  private audioLength = 0;
  private blocks: Uint8Array[] = [];
  private blockStart = 0;
  private probsFrames = 0;
  private frame = 0;
  private owner = -1;
  private runStart = 0;
  private runOffset = 0;

  constructor(
    private readonly spill: Pick<AudioSpill, 'append' | 'rewind' | 'addRun'>,
    private readonly numChannels: number,
    private readonly p: Pick<typeof RESCORE_PARAMS, 'minRunFrames'> = RESCORE_PARAMS,
  ) {}

  pushAudio(samples: Float32Array): void {
    this.reserve(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const x = Math.max(-1, Math.min(1, samples[i]));
      this.audio[this.audioLength + i] = Math.round(x * 32767);
    }
    this.audioLength += samples.length;
    this.drain(false);
  }

  pushProbs(block: Uint8Array): void {
    this.blocks.push(block);
    this.probsFrames += block.length / this.numChannels;
    this.drain(false);
  }

  finish(): void {
    this.drain(true);
    this.closeRun(this.frame);
  }

  private drain(final: boolean): void {
    const audioEnd = this.audioStart + this.audioLength;
    while (this.frame < this.probsFrames) {
      const needed = this.frame * HOP_SAMPLES + WINDOW_TAIL_SAMPLES;
      if (!final && audioEnd < needed) break;
      if (final && audioEnd <= this.frame * HOP_SAMPLES) break;
      this.step(this.frame, this.ownerAt(this.frame));
      this.frame += 1;
    }
    this.dropBefore(this.frame * HOP_SAMPLES);
  }

  private step(t: number, owner: number): void {
    if (owner !== this.owner) {
      this.closeRun(t);
      if (owner >= 0) this.openRun(t, owner);
    }
    if (this.owner >= 0) this.spill.append(this.slice(t * HOP_SAMPLES, HOP_SAMPLES));
  }

  private openRun(t: number, owner: number): void {
    this.owner = owner;
    this.runStart = t;
    this.runOffset = this.spill.append(new Int16Array(0));
  }

  private closeRun(t: number): void {
    if (this.owner < 0) return;
    const frames = t - this.runStart;
    if (frames < this.p.minRunFrames) {
      this.spill.rewind(this.runOffset);
    } else {
      const tail = this.slice(t * HOP_SAMPLES, WINDOW_TAIL_SAMPLES);
      const end = this.spill.append(tail) + tail.length;
      this.spill.addRun({
        channel: this.owner,
        startFrame: this.runStart,
        endFrame: t,
        offset: this.runOffset,
        length: end - this.runOffset,
      });
    }
    this.owner = -1;
  }

  private ownerAt(t: number): number {
    while (t - this.blockStart >= this.blocks[0].length / this.numChannels) {
      this.blockStart += this.blocks.shift()!.length / this.numChannels;
    }
    const base = (t - this.blockStart) * this.numChannels;
    let owner = -1;
    for (let c = 0; c < this.numChannels; c += 1) {
      if (this.blocks[0][base + c] < OWNER_THRESHOLD) continue;
      if (owner >= 0) return -1;
      owner = c;
    }
    return owner;
  }

  private slice(start: number, length: number): Int16Array {
    const from = Math.max(0, start - this.audioStart);
    const to = Math.min(this.audioLength, from + length);
    return this.audio.slice(from, Math.max(from, to));
  }

  private dropBefore(sample: number): void {
    const drop = Math.min(this.audioLength, Math.max(0, sample - this.audioStart));
    if (drop === 0) return;
    this.audio.copyWithin(0, drop, this.audioLength);
    this.audioStart += drop;
    this.audioLength -= drop;
  }

  private reserve(extra: number): void {
    if (this.audioLength + extra <= this.audio.length) return;
    const grown = new Int16Array(Math.max(this.audio.length * 2, this.audioLength + extra));
    grown.set(this.audio.subarray(0, this.audioLength));
    this.audio = grown;
  }
}
