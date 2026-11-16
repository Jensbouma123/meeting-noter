import type { RescoreWindow, SpillBackend, SpillEnvironment, SpillReader, SpillRun } from '../types/rescore';
import { HOP_SAMPLES, WINDOW_TAIL_SAMPLES } from './params';
import { openSpillBackend } from './spill-backend';

const STAGING_SAMPLES = 16000;

export class AudioSpill implements SpillReader {
  private readonly staging = new Int16Array(STAGING_SAMPLES);
  private staged = 0;
  private written = 0;
  private chain: Promise<void> = Promise.resolve();
  private runList: SpillRun[] = [];

  constructor(private readonly backend: SpillBackend) {}

  static async open(name: string, env?: SpillEnvironment): Promise<AudioSpill> {
    return new AudioSpill(await openSpillBackend(name, env));
  }

  get kind(): SpillBackend['kind'] {
    return this.backend.kind;
  }

  get length(): number {
    return this.written + this.staged;
  }

  get runs(): readonly SpillRun[] {
    return this.runList;
  }

  append(samples: Int16Array): number {
    const offset = this.length;
    for (let i = 0; i < samples.length; ) {
      const n = Math.min(samples.length - i, STAGING_SAMPLES - this.staged);
      this.staging.set(samples.subarray(i, i + n), this.staged);
      this.staged += n;
      i += n;
      if (this.staged === STAGING_SAMPLES) this.writeStaging();
    }
    return offset;
  }

  rewind(offset: number): void {
    const target = Math.max(0, Math.min(offset, this.length));
    this.runList = this.runList.filter((run) => run.offset + run.length <= target);
    if (target >= this.written) {
      this.staged = target - this.written;
      return;
    }
    this.staged = 0;
    this.written = target;
    this.enqueue(() => this.backend.truncate(target));
  }

  addRun(run: SpillRun): void {
    this.runList.push(run);
  }

  async readWindow(window: RescoreWindow): Promise<Int16Array> {
    const run = this.runList.find(
      (r) => r.channel === window.channel && r.startFrame <= window.start && window.end <= r.endFrame,
    );
    if (!run) return new Int16Array(0);
    const offset = run.offset + (window.start - run.startFrame) * HOP_SAMPLES;
    const wanted = (window.end - window.start) * HOP_SAMPLES + WINDOW_TAIL_SAMPLES;
    const length = Math.min(wanted, run.offset + run.length - offset);
    if (offset + length > this.written) this.writeStaging();
    await this.chain;
    return this.backend.read(offset, length);
  }

  async flush(): Promise<void> {
    this.writeStaging();
    await this.chain;
  }

  async delete(): Promise<void> {
    this.staged = 0;
    this.written = 0;
    this.runList = [];
    await this.chain.catch(() => undefined);
    await this.backend.remove();
  }

  private writeStaging(): void {
    if (this.staged === 0) return;
    const data = this.staging.slice(0, this.staged);
    const at = this.written;
    this.written += this.staged;
    this.staged = 0;
    this.enqueue(() => this.backend.write(at, data));
  }

  private enqueue(task: () => Promise<void>): void {
    this.chain = this.chain.then(task);
  }
}
